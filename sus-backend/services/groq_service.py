import os
import json
import time
import logging
import re

from groq import Groq, RateLimitError, APIStatusError

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# 🔹 CLIENT
# ─────────────────────────────────────────────
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Model fallback chain:
# - llama-3.3-70b  → best quality, 1,000 req/day
# - llama-3.1-8b   → fastest,     14,400 req/day  ← almost never hits limits
MODEL_CHAIN = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

MAX_RETRIES = 3
BASE_BACKOFF = 2  # seconds


# ─────────────────────────────────────────────
# 🔹 PROMPT BUILDER
# ─────────────────────────────────────────────
def build_prompt(claim: str, context_text: str, dates: list) -> str:
    return f"""You are a neutral media analyst. Analyze the following news claim using ONLY the trusted source excerpts provided below.

CLAIM:
{claim}

TRUSTED SOURCE EXCERPTS:
{context_text if context_text else "No trusted sources found for this claim."}

ARTICLE DATES:
{dates}

Your tasks:
1. Determine event recency: recent | not_recent | long_time_ago | ongoing | unclear
2. Detect bias types if present: omission | framing | half-fact | source
3. Score truth/reliability 0-100 based on source agreement, recency, completeness, bias severity
4. Write a balanced 2-3 sentence neutral summary
5. Write a clear "reasoning" field (2-4 sentences) that explains exactly WHY you chose the final_verdict — cite specific evidence from the sources, mention what matched or conflicted, and what was missing

IMPORTANT: Respond ONLY with a raw valid JSON object. No markdown, no backticks, no extra text.

{{
  "event_recency": "<recent|not_recent|long_time_ago|ongoing|unclear>",
  "truth_score": <integer 0-100>,
  "bias_detected": <true|false>,
  "bias_types": ["<omission|framing|half-fact|source>"],
  "missing_context": "<what important context is missing, or 'none'>",
  "summary": "<neutral 2-3 sentence summary>",
  "final_verdict": "<verified|partially misleading|misleading|unclear>",
  "reasoning": "<2-4 sentences explaining exactly why this verdict was chosen, with specific reference to the sources and what evidence supports or contradicts the claim>"
}}"""


# ─────────────────────────────────────────────
# 🔹 JSON PARSER
# ─────────────────────────────────────────────
def parse_response(text: str) -> dict:
    """Robustly extract and parse a JSON object from LLM output."""
    text = text.strip()

    # Strip markdown fences if present
    text = re.sub(r"```(?:json)?", "", text).strip()

    # Extract the JSON block between first { and last }
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end <= start:
        raise ValueError("No JSON object found in response")

    json_str = text[start:end]
    return json.loads(json_str)


# ─────────────────────────────────────────────
# 🔹 FIELD VALIDATOR
# ─────────────────────────────────────────────
def ensure_fields(result: dict) -> dict:
    """
    Guarantee every field exists with the correct type.
    Groq sometimes returns truth_score as a string ("75"),
    or omits it entirely — this normalises everything.
    """
    # truth_score: must be int 0-100
    raw_score = result.get("truth_score", 0)
    try:
        score = int(float(str(raw_score).strip()))
        score = max(0, min(100, score))   # clamp to 0-100
    except (ValueError, TypeError):
        logger.warning(f"Could not parse truth_score={raw_score!r}, defaulting to 0")
        score = 0
    result["truth_score"] = score

    # event_recency: must be one of the valid values
    valid_recency = {"recent", "not_recent", "long_time_ago", "ongoing", "unclear"}
    if result.get("event_recency") not in valid_recency:
        result["event_recency"] = "unclear"

    # final_verdict: must be one of the valid values
    valid_verdicts = {"verified", "partially misleading", "misleading", "unclear"}
    if result.get("final_verdict") not in valid_verdicts:
        result["final_verdict"] = "unclear"

    # bias_detected: must be bool
    result["bias_detected"] = bool(result.get("bias_detected", False))

    # bias_types: must be list
    if not isinstance(result.get("bias_types"), list):
        result["bias_types"] = []

    # string fields: default to empty string if missing
    for field in ["summary", "reasoning", "missing_context"]:
        if not result.get(field):
            result[field] = "Not available"

    return result


# ─────────────────────────────────────────────
# 🔹 FALLBACK RESPONSE
# ─────────────────────────────────────────────
def fallback_response(reason: str = "Analysis unavailable") -> dict:
    return {
        "event_recency": "unclear",
        "truth_score": 0,
        "bias_detected": False,
        "bias_types": [],
        "missing_context": reason,
        "summary": f"AI analysis temporarily unavailable: {reason}",
        "final_verdict": "unclear",
        "reasoning": f"Verdict could not be determined because the AI analysis failed: {reason}",
    }


# ─────────────────────────────────────────────
# 🔹 GROQ CALL WITH RETRY + MODEL FALLBACK
# ─────────────────────────────────────────────
def call_groq_with_retry(prompt: str) -> str:
    """
    Try each model in MODEL_CHAIN.
    Retry up to MAX_RETRIES times on rate limit (429).
    Falls back to next model if quota exhausted on current model.
    """
    for model in MODEL_CHAIN:
        logger.info(f"Trying Groq model: {model}")

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
                    temperature=0.1,   # low temp = more consistent JSON
                    max_tokens=800,
                )

                text = response.choices[0].message.content
                logger.info(f"Success with model: {model}")
                return text

            except RateLimitError as e:
                # Parse retry-after if available
                retry_after = BASE_BACKOFF ** attempt
                try:
                    match = re.search(r"Please try again in ([\d.]+)s", str(e))
                    if match:
                        retry_after = max(retry_after, float(match.group(1)) + 1)
                except Exception:
                    pass

                if attempt < MAX_RETRIES:
                    logger.warning(
                        f"Rate limit on {model} (attempt {attempt}/{MAX_RETRIES}). "
                        f"Retrying in {retry_after:.1f}s..."
                    )
                    time.sleep(retry_after)
                else:
                    logger.warning(
                        f"Rate limit on {model} after {MAX_RETRIES} retries. "
                        f"Falling back to next model..."
                    )
                    break  # try next model

            except APIStatusError as e:
                logger.error(f"Groq API error on {model}: {e.status_code} - {e.message}")
                break  # try next model

            except Exception as e:
                logger.error(f"Unexpected error on {model}: {type(e).__name__}: {e}")
                break  # try next model

    raise RuntimeError("All Groq models failed or rate limits exhausted.")


# ─────────────────────────────────────────────
# 🔹 MAIN ANALYZE FUNCTION
# ─────────────────────────────────────────────
def analyze_claim(claim: str, context_text: str, dates: list) -> dict:
    """
    Analyze a news claim using Groq (Llama).
    Never raises — always returns a valid dict.
    """
    if not claim or not claim.strip():
        return fallback_response("No claim provided.")

    prompt = build_prompt(claim, context_text, dates)

    try:
        raw_text = call_groq_with_retry(prompt)

    except RuntimeError as e:
        logger.error(f"Groq completely failed: {e}")
        return fallback_response(
            "All AI models are currently rate-limited. Please wait a minute and try again."
        )

    except Exception as e:
        logger.error(f"Unexpected error calling Groq: {e}")
        return fallback_response(f"Unexpected error: {type(e).__name__}")

    try:
        result = parse_response(raw_text)

        # ── Log full raw result so you can see exactly what Groq returned ──
        logger.info(f"Raw Groq result: {result}")
        logger.info(f"Verdict: {result.get('final_verdict')} | Score: {result.get('truth_score')} | Type: {type(result.get('truth_score'))}")

        # ── Ensure all required fields exist with correct types ──────────────
        result = ensure_fields(result)
        logger.info(f"After ensure_fields → truth_score: {result['truth_score']}")
        return result

    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Failed to parse Groq response as JSON: {e}\nRaw: {raw_text[:300]}")
        return fallback_response("Could not parse AI response as JSON.")