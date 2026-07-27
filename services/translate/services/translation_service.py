import os
import json
import re
import time
import logging

from groq import Groq, RateLimitError, APIStatusError
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL_CHAIN = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

MAX_RETRIES = 3
BASE_BACKOFF = 2

# Full name map — used to build the translation prompt
ALL_TARGET_LANGUAGES = {
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


def _call_groq(prompt: str) -> str:
    for model in MODEL_CHAIN:
        logger.info(f"[translation] Trying model: {model}")
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a multilingual translation engine. "
                                "Return ONLY valid JSON. "
                                "No markdown, no explanations."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,
                    max_tokens=2000,   # OPTIMIZATION: was 1000, reduced since fewer langs
                )
                logger.info(f"[translation] Success with model: {model}")
                return response.choices[0].message.content.strip()

            except RateLimitError as e:
                retry_after = BASE_BACKOFF ** attempt
                try:
                    m = re.search(r"Please try again in ([\d.]+)s", str(e))
                    if m:
                        retry_after = max(retry_after, float(m.group(1)) + 1)
                except Exception:
                    pass
                if attempt < MAX_RETRIES:
                    logger.warning(f"[translation] Rate limit on {model}, retrying in {retry_after:.1f}s")
                    time.sleep(retry_after)
                else:
                    logger.warning(f"[translation] Rate limit on {model} exhausted, trying next model")
                    break

            except APIStatusError as e:
                logger.error(f"[translation] API error on {model}: {e.status_code}")
                break
            except Exception as e:
                logger.error(f"[translation] Error on {model}: {type(e).__name__}: {e}")
                break

    raise RuntimeError("[translation] All models failed.")


def generate_multilingual_queries(text: str, target_languages: list = None) -> dict:
    """
    Translate input text into the specified target languages.

    OPTIMIZATION: target_languages parameter lets the caller pass only the
    language codes actually needed (e.g. those present in selected sources).
    Previously always translated to all 12 languages regardless of need,
    wasting ~40% of the LLM prompt budget and adding 1-2s of latency.

    Args:
        text: The query string to translate.
        target_languages: list of ISO codes to translate to.
                          Defaults to all supported languages if None.

    Returns:
        dict of {lang_code: translated_text}, always including "en".
    """
    # Always include English
    langs_to_use = list(set(["en"] + (target_languages or list(ALL_TARGET_LANGUAGES.keys()))))

    # Filter to only codes we know how to name
    langs_to_use = [l for l in langs_to_use if l in ALL_TARGET_LANGUAGES]

    # If only English is needed, skip the LLM call entirely
    if langs_to_use == ["en"] or (len(langs_to_use) == 1 and langs_to_use[0] == "en"):
        logger.info("[translation] Only English needed — skipping LLM call")
        return {"en": text}

    try:
        language_list = "\n".join(
            f"{code}: {ALL_TARGET_LANGUAGES[code]}" for code in langs_to_use
        )

        prompt = f"""Translate the following news/query into ALL these languages.

IMPORTANT RULES:
- Keep meaning accurate and natural.
- Keep it concise.
- Return ONLY valid JSON.
- Keys MUST be the exact language codes listed below.
- Do NOT add explanations or markdown.

Languages:
{language_list}

Input:
{text}"""

        content = _call_groq(prompt)
        content = re.sub(r"```(?:json)?", "", content).strip().strip("`").strip()
        translations = json.loads(content)

        if "en" not in translations:
            translations["en"] = text

        return translations

    except RuntimeError as e:
        logger.error(f"[translation] Groq unavailable: {e}")
        return {"en": text}
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"[translation] JSON parse error: {e}")
        return {"en": text}
    except Exception as e:
        logger.error(f"[translation] Unexpected error: {type(e).__name__}: {e}")
        return {"en": text}