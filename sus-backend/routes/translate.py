import os
import logging
import re
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq, RateLimitError
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
}

MODEL_CHAIN = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

MAX_RETRIES = 3
BASE_BACKOFF = 2


class TranslateRequest(BaseModel):
    summary:         str
    reasoning:       str  = ""
    target:          str          # "en" or "hi"
    source_language: str = "unknown"


class TranslateResponse(BaseModel):
    summary:   str
    reasoning: str
    target:    str


def _translate_text(text: str, target_lang: str) -> str:
    """Translate a block of text to target_lang using Groq with model fallback."""
    if not text or not text.strip():
        return ""

    target_name = LANGUAGE_NAMES.get(target_lang, "English")

    prompt = f"""Translate the following text to {target_name}.

RULES:
- Keep the meaning accurate and natural.
- Do NOT add any explanation or preamble.
- Return ONLY the translated text, nothing else.

TEXT:
{text}"""

    for model in MODEL_CHAIN:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": f"You are a precise translator. Translate to {target_name} only. Return only the translated text, no explanations.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,
                    max_tokens=1000,
                )
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
                    logger.warning(f"[translate] Rate limit on {model}, retrying in {retry_after:.1f}s")
                    time.sleep(retry_after)
                else:
                    logger.warning(f"[translate] Rate limit exhausted on {model}, trying next model")
                    break

            except Exception as e:
                logger.error(f"[translate] Error on {model}: {type(e).__name__}: {e}")
                break  # try next model

    raise RuntimeError("All translation models failed.")


@router.post("/translate", response_model=TranslateResponse)
async def translate_analysis(req: TranslateRequest):
    """
    Translate summary and reasoning fields to the target language.
    target must be 'en' or 'hi'.
    """
    if req.target not in ("en", "hi"):
        raise HTTPException(status_code=400, detail="target must be 'en' or 'hi'")

    if not req.summary and not req.reasoning:
        raise HTTPException(status_code=400, detail="No text provided to translate")

    try:
        translated_summary   = _translate_text(req.summary,   req.target) if req.summary   else ""
        translated_reasoning = _translate_text(req.reasoning, req.target) if req.reasoning else ""

        return TranslateResponse(
            summary=translated_summary,
            reasoning=translated_reasoning,
            target=req.target,
        )

    except RuntimeError as e:
        logger.error(f"[translate] All models failed: {e}")
        raise HTTPException(status_code=503, detail="Translation service temporarily unavailable.")
    except Exception as e:
        logger.exception(f"[translate] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))