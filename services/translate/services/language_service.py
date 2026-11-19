from langdetect import detect, DetectorFactory

# ─────────────────────────────────────────────
# Seed langdetect for deterministic results
# BUG FIX: langdetect uses random seeding internally — without this,
# the same text can produce different language codes across calls.
# ─────────────────────────────────────────────
DetectorFactory.seed = 0

# ─────────────────────────────────────────────
# Supported Languages
# Mirrors the 12-language target set, minus pa/gu/ml which have
# no reliable langdetect OR EasyOCR support.
# Note: pa (Punjabi) detection in langdetect works but EasyOCR
# cannot OCR the script, so keep pa here for text-input flows.
# ─────────────────────────────────────────────
SUPPORTED_LANGUAGES = {
    "en",  # English
    "hi",  # Hindi
    "pa",  # Punjabi  (text-input only; no OCR support)
    "ta",  # Tamil
    "te",  # Telugu
    "bn",  # Bengali
    "gu",  # Gujarati (text-input only; no OCR support)
    "mr",  # Marathi
    "kn",  # Kannada
    "ml",  # Malayalam (text-input only; no OCR support)
    "as",  # Assamese
    "ur",  # Urdu
}


# ─────────────────────────────────────────────
# Detect Language
# ─────────────────────────────────────────────
def detect_language(text: str) -> dict:
    """
    Detect language from input text.

    Returns:
    {
        "detected": detected language code,
        "supported": True/False,
        "fallback": language code to use (detected if supported, else "en")
    }
    """

    try:
        # Empty text fallback
        if not text or not text.strip():
            return {
                "detected": "en",
                "supported": True,
                "fallback": "en",
            }

        detected = detect(text)

        # Fully supported
        if detected in SUPPORTED_LANGUAGES:
            return {
                "detected": detected,
                "supported": True,
                "fallback": detected,
            }

        # Unsupported language — fall back to English
        return {
            "detected": detected,
            "supported": False,
            "fallback": "en",
        }

    except Exception:
        # Any detection failure
        return {
            "detected": "unknown",
            "supported": False,
            "fallback": "en",
        }