import os
import json
import time
import logging
import re

from dotenv import load_dotenv
from groq import Groq, RateLimitError, APIStatusError
from services.language_service import detect_language

logger = logging.getLogger(__name__)

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL_CHAIN = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

MAX_RETRIES = 3
BASE_BACKOFF = 2

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "pa": "Punjabi",
    "ta": "Tamil",
    "te": "Telugu",
    "bn": "Bengali",
    "gu": "Gujarati",
    "mr": "Marathi",
    "kn": "Kannada",
    "ml": "Malayalam",
    "as": "Assamese",
    "ur": "Urdu",
}

# ─────────────────────────────────────────────
# 🔹 LANGUAGE-AWARE FALLBACK STRINGS
# ─────────────────────────────────────────────
FALLBACK_STRINGS = {
    "en": {
        "unavailable": "AI analysis temporarily unavailable",
        "no_verdict":  "Verdict could not be determined",
        "not_available": "Not available",
    },
    "hi": {
        "unavailable": "AI विश्लेषण अस्थायी रूप से उपलब्ध नहीं है",
        "no_verdict":  "निर्णय निर्धारित नहीं किया जा सका",
        "not_available": "उपलब्ध नहीं",
    },
    "te": {
        "unavailable": "AI విశ్లేషణ తాత్కాలికంగా అందుబాటులో లేదు",
        "no_verdict":  "తీర్పు నిర్ణయించబడలేదు",
        "not_available": "అందుబాటులో లేదు",
    },
    "ta": {
        "unavailable": "AI பகுப்பாய்வு தற்காலிகமாக கிடைக்கவில்லை",
        "no_verdict":  "தீர்ப்பு தீர்மானிக்கப்படவில்லை",
        "not_available": "கிடைக்கவில்லை",
    },
    "bn": {
        "unavailable": "AI বিশ্লেষণ সাময়িকভাবে অনুপলব্ধ",
        "no_verdict":  "রায় নির্ধারণ করা যায়নি",
        "not_available": "উপলব্ধ নয়",
    },
    "kn": {
        "unavailable": "AI ವಿಶ್ಲೇಷಣೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ",
        "no_verdict":  "ತೀರ್ಪು ನಿರ್ಧರಿಸಲಾಗಲಿಲ್ಲ",
        "not_available": "ಲಭ್ಯವಿಲ್ಲ",
    },
    "mr": {
        "unavailable": "AI विश्लेषण तात्पुरते अनुपलब्ध आहे",
        "no_verdict":  "निकाल निर्धारित करता आला नाही",
        "not_available": "उपलब्ध नाही",
    },
    "pa": {
        "unavailable": "AI ਵਿਸ਼ਲੇਸ਼ਣ ਅਸਥਾਈ ਤੌਰ 'ਤੇ ਉਪਲਬਧ ਨਹੀਂ ਹੈ",
        "no_verdict":  "ਫੈਸਲਾ ਨਿਰਧਾਰਿਤ ਨਹੀਂ ਕੀਤਾ ਜਾ ਸਕਿਆ",
        "not_available": "ਉਪਲਬਧ ਨਹੀਂ",
    },
    "ur": {
        "unavailable": "AI تجزیہ عارضی طور پر دستیاب نہیں ہے",
        "no_verdict":  "فیصلہ نہیں ہو سکا",
        "not_available": "دستیاب نہیں",
    },
    "gu": {
        "unavailable": "AI વિશ્લેષણ અસ્થાયી રૂપે અનુપલબ્ધ છે",
        "no_verdict":  "ચુકાદો નક્કી કરી શકાયો નહીં",
        "not_available": "ઉપલબ્ધ નથી",
    },
    "ml": {
        "unavailable": "AI വിശകലനം താൽക്കാലികമായി ലഭ്യമല്ല",
        "no_verdict":  "വിധി നിർണ്ണയിക്കാൻ കഴിഞ്ഞില്ല",
        "not_available": "ലഭ്യമല്ല",
    },
    "as": {
        "unavailable": "AI বিশ্লেষণ সাময়িকভাৱে অনুপলব্ধ",
        "no_verdict":  "ৰায় নিৰ্ধাৰণ কৰিব পৰা নগ'ল",
        "not_available": "উপলব্ধ নহয়",
    },
}

def get_fallback_str(lang: str, key: str) -> str:
    return FALLBACK_STRINGS.get(lang, FALLBACK_STRINGS["en"])[key]


# ─────────────────────────────────────────────
# 🔹 JSON PARSER (robust — handles truncation)
# ─────────────────────────────────────────────
def parse_response(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"```(?:json)?", "", text).strip()
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start == -1 or end <= start:
        raise ValueError("No JSON object found in response")

    json_str = text[start:end]

    # First attempt — clean parse
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    # Second attempt — salvage truncated JSON by trimming to last valid closing brace
    for i in range(len(json_str), 0, -1):
        try:
            return json.loads(json_str[:i])
        except json.JSONDecodeError:
            continue

    raise ValueError("Could not parse JSON even after truncation recovery")


# ─────────────────────────────────────────────
# 🔹 FIELD VALIDATOR
# ─────────────────────────────────────────────
def ensure_fields(result: dict, lang: str = "en") -> dict:
    raw_score = result.get("truth_score", 0)
    try:
        score = int(float(str(raw_score).strip()))
        score = max(0, min(100, score))
    except (ValueError, TypeError):
        score = 0
    result["truth_score"] = score

    valid_recency  = {"recent", "old", "not_recent", "long_time_ago", "ongoing", "unclear"}
    valid_verdicts = {"true", "verified", "partially misleading", "misleading", "false", "unclear"}

    if result.get("event_recency") not in valid_recency:
        result["event_recency"] = "unclear"
    if result.get("final_verdict") not in valid_verdicts:
        result["final_verdict"] = "unclear"

    result["bias_detected"] = bool(result.get("bias_detected", False))
    if not isinstance(result.get("bias_types"), list):
        result["bias_types"] = []

    not_available = get_fallback_str(lang, "not_available")
    for field in ["summary", "reasoning", "missing_context"]:
        if not result.get(field):
            result[field] = not_available

    return result


# ─────────────────────────────────────────────
# 🔹 FALLBACK RESPONSE (language-aware)
# ─────────────────────────────────────────────
def fallback_response(reason: str = "Analysis unavailable", lang_info: dict = None) -> dict:
    lang = lang_info.get("fallback", "en") if lang_info else "en"

    unavailable  = get_fallback_str(lang, "unavailable")
    no_verdict   = get_fallback_str(lang, "no_verdict")
    not_available = get_fallback_str(lang, "not_available")

    fb = {
        "event_recency":   "unclear",
        "truth_score":     0,
        "bias_detected":   False,
        "bias_types":      [],
        "missing_context": not_available,
        "summary":         f"{unavailable}: {reason}",
        "final_verdict":   "unclear",
        "reasoning":       f"{no_verdict}: {reason}",
        "detected_language":  lang,
        "language_supported": lang_info.get("supported", False) if lang_info else False,
    }
    return fb


# ─────────────────────────────────────────────
# 🔹 GROQ CALL WITH RETRY + MODEL FALLBACK
# ─────────────────────────────────────────────
def call_groq_with_retry(prompt: str, max_tokens: int = 1200) -> str:
    for model in MODEL_CHAIN:
        logger.info(f"Trying model: {model}")
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a neutral media analyst. "
                                "Always respond with valid JSON only. "
                                "No markdown, no explanations outside the JSON."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,
                    max_tokens=max_tokens,  # increased from 800
                )
                logger.info(f"Success with model: {model}")
                return response.choices[0].message.content

            except RateLimitError as e:
                retry_after = BASE_BACKOFF ** attempt
                try:
                    m = re.search(r"Please try again in ([\d.]+)s", str(e))
                    if m:
                        retry_after = max(retry_after, float(m.group(1)) + 1)
                except Exception:
                    pass
                if attempt < MAX_RETRIES:
                    logger.warning(f"Rate limit on {model} attempt {attempt}, retrying in {retry_after:.1f}s")
                    time.sleep(retry_after)
                else:
                    logger.warning(f"Rate limit on {model} exhausted, trying next model")
                    break

            except APIStatusError as e:
                logger.error(f"API error on {model}: {e.status_code} - {e.message}")
                break
            except Exception as e:
                logger.error(f"Unexpected error on {model}: {type(e).__name__}: {e}")
                break

    raise RuntimeError("All Groq models failed or rate limits exhausted.")


# ─────────────────────────────────────────────
# 🔹 MAIN ANALYSIS (MULTILINGUAL)
# ─────────────────────────────────────────────
def analyze_claim(claim: str, context_text: str, dates: list) -> dict:
    if not claim or not claim.strip():
        return fallback_response("No claim provided.")

    # Detect language
    try:
        language_info     = detect_language(claim)
        detected_language = language_info["fallback"]
        logger.info(f"Detected language: {detected_language}")
    except Exception as e:
        logger.error(f"Language detection failed: {e}")
        language_info     = {"fallback": "en", "supported": False}
        detected_language = "en"

    language_name = LANGUAGE_NAMES.get(detected_language, "English")

    if detected_language != "en":
        language_instruction = f"""
CRITICAL LANGUAGE REQUIREMENT:
The user's content is in {language_name}. You MUST write ALL text values in the JSON
response in {language_name} — this includes summary, reasoning, and missing_context.
Do NOT write these fields in English. Write them in {language_name} only.
If you write in English when the input is {language_name}, your response is WRONG.
"""
        json_example = f"""{{
    "event_recency": "recent / old / unclear",
    "truth_score": 0-100,
    "bias_detected": true or false,
    "bias_types": ["...in {language_name}..."],
    "missing_context": "...written entirely in {language_name}...",
    "summary": "...written entirely in {language_name}...",
    "reasoning": "...written entirely in {language_name}...",
    "final_verdict": "true / misleading / false / unclear"
}}"""
    else:
        language_instruction = ""
        json_example = """{
    "event_recency": "recent / old / unclear",
    "truth_score": 0-100,
    "bias_detected": true or false,
    "bias_types": ["..."],
    "missing_context": "...",
    "summary": "...",
    "reasoning": "...",
    "final_verdict": "true / misleading / false / unclear"
}"""

    prompt = f"""You are an advanced neutral misinformation and media analysis AI.

Your task:
- Analyze the claim carefully
- Compare against provided evidence
- Detect bias, propaganda, omission, emotional framing, or misleading narratives
- Determine if event appears recent or outdated
- Generate neutral reasoning

{language_instruction}

CLAIM:
{claim}

SEARCH CONTEXT:
{context_text if context_text else "No trusted sources found for this claim."}

DATES:
{dates}

IMPORTANT OUTPUT RULES:
- Return ONLY valid JSON — no markdown, no text before or after
- Ensure all string values are properly closed with quotes
- final_verdict MUST be one of: true / misleading / false / unclear

JSON FORMAT:
{json_example}"""

    try:
        raw_response = call_groq_with_retry(prompt, max_tokens=1200)
        parsed       = parse_response(raw_response)
        logger.info(f"Verdict: {parsed.get('final_verdict')} | Score: {parsed.get('truth_score')}")
        parsed = ensure_fields(parsed, lang=detected_language)

    except RuntimeError as e:
        logger.error(f"All models failed: {e}")
        return fallback_response(
            "All AI models are currently rate-limited. Please wait a minute and try again.",
            lang_info=language_info,
        )
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"JSON parse failed: {e}")
        return fallback_response("Could not parse AI response as valid JSON.", lang_info=language_info)
    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}: {e}")
        return fallback_response(f"Unexpected error: {type(e).__name__}", lang_info=language_info)

    parsed["detected_language"]  = detected_language
    parsed["language_supported"] = language_info["supported"]
    return parsed


# ─────────────────────────────────────────────
# 🔹 EXPLAIN CLAIM (language-aware)
# ─────────────────────────────────────────────
def explain_claim(claim: str, context_text: str, language: str = "en") -> str:
    """
    Generate a neutral, detailed background explanation of the claim's topic.
    Returns a plain text paragraph in the detected input language.
    """
    language_name = LANGUAGE_NAMES.get(language, "English")

    lang_rule = (
        f"Write the explanation entirely in {language_name}. Do not use English."
        if language != "en" else
        "Write the explanation in clear, simple English."
    )

    prompt = f"""You are a neutral educational journalist.

A fact-checking tool has analyzed this claim:
CLAIM: {claim}

BACKGROUND CONTEXT FROM NEWS SOURCES:
{context_text if context_text else "No specific context available."}

Your task:
Write a detailed, neutral background paragraph (150–250 words) explaining:
1. What this topic/event is about
2. Why it matters or how it started
3. The different perspectives involved (without taking sides)
4. What ordinary people should know to understand the full picture

Rules:
- Be neutral and informative. Do not express opinions.
- Use simple language that anyone can understand.
- {lang_rule}
- Return ONLY the explanation paragraph, no JSON, no headers, no bullet points.
"""

    for model in MODEL_CHAIN:
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": f"You are a neutral educational journalist. {lang_rule}"},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.3,
                max_tokens=700,
            )
            return response.choices[0].message.content.strip()
        except RateLimitError:
            continue
        except Exception as e:
            logger.error(f"explain_claim error on {model}: {e}")
            continue

    unavailable = get_fallback_str(language, "unavailable")
    return unavailable