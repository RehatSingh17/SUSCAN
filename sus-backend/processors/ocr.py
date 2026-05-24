import io
import logging
import numpy as np
import easyocr
from PIL import Image

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# EasyOCR Script Compatibility Groups
#
# Each group = one Reader instance
# Scripts that share the same underlying model
# can be grouped; others must be isolated.
# ─────────────────────────────────────────────
READER_GROUPS = {
    "devanagari": ["en", "hi", "mr"],   # Devanagari script — compatible together
    "arabic":     ["en", "ur"],          # Arabic/Nastaliq script
    "bengali":    ["en", "bn", "as"],    # Bengali script — Assamese shares it
    "tamil":      ["en", "ta"],          # Tamil — isolated
    "telugu":     ["en", "te"],          # Telugu — isolated
    "kannada":    ["en", "kn"],          # Kannada — isolated
}

# Lazy-loaded reader cache
_readers: dict = {}


def get_reader(group_name: str) -> easyocr.Reader:
    if group_name not in _readers:
        langs = READER_GROUPS[group_name]
        logger.info(f"[OCR] Loading '{group_name}' reader: {langs}")
        _readers[group_name] = easyocr.Reader(langs, gpu=True)
    return _readers[group_name]


# ─────────────────────────────────────────────
# MAIN FUNCTION
# ─────────────────────────────────────────────
def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Extract multilingual text from image bytes.
    Each script group runs through its own isolated EasyOCR reader.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)

    all_text = []

    for group_name in READER_GROUPS:
        try:
            results = get_reader(group_name).readtext(img_array)
            texts = [text for (_, text, conf) in results if conf > 0.3]
            all_text.extend(texts)
            logger.info(f"[OCR] '{group_name}' extracted {len(texts)} segments")
        except Exception as e:
            logger.warning(f"[OCR] '{group_name}' reader failed: {e}")
            continue

    final = " ".join(all_text).strip()
    logger.info(f"[OCR] Total extracted length: {len(final)} chars")
    return final