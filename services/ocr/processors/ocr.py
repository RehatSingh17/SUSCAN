import io
import logging
import threading
import numpy as np
import easyocr
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

# Tamil permanently excluded — model weight mismatch on this machine
READER_GROUPS = {
    "devanagari": ["en", "hi", "mr"],
    "arabic":     ["en", "ur"],
    "bengali":    ["en", "bn", "as"],
    "telugu":     ["en", "te"],
    "kannada":    ["en", "kn"],
}

# Global reader cache + per-group locks to prevent duplicate loading
_readers: dict  = {}
_locks:   dict  = {g: threading.Lock() for g in READER_GROUPS}


def get_reader(group_name: str):
    """Return cached reader. Thread-safe — only loads once per group."""
    if group_name in _readers:
        return _readers[group_name]

    with _locks[group_name]:
        # Double-check inside lock
        if group_name in _readers:
            return _readers[group_name]
        langs = READER_GROUPS[group_name]
        logger.info(f"[OCR] Loading '{group_name}' reader: {langs}")
        try:
            _readers[group_name] = easyocr.Reader(langs, gpu=False)
        except Exception as e:
            logger.warning(f"[OCR] Failed to load '{group_name}': {e}")
            _readers[group_name] = None

    return _readers[group_name]


def _run_one_group(group_name: str, img_array: np.ndarray) -> list:
    """Run OCR for one script group. Returns deduplicated text list."""
    reader = get_reader(group_name)
    if reader is None:
        return []
    try:
        results = reader.readtext(img_array)
        texts = [t for (_, t, c) in results if c > 0.3]
        logger.info(f"[OCR] '{group_name}' extracted {len(texts)} segments")
        return texts
    except Exception as e:
        logger.warning(f"[OCR] '{group_name}' failed: {e}")
        return []


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Extract multilingual text from image bytes.
    All script groups run in parallel via ThreadPoolExecutor.
    Readers are cached after first load — subsequent requests are fast.
    """
    image     = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)

    all_text  = []
    seen      = set()

    with ThreadPoolExecutor(max_workers=len(READER_GROUPS)) as ex:
        futures = {
            ex.submit(_run_one_group, group, img_array): group
            for group in READER_GROUPS
        }
        for future in as_completed(futures):
            for text in future.result():
                if text.strip() and text not in seen:
                    seen.add(text)
                    all_text.append(text)

    final = " ".join(all_text).strip()
    logger.info(f"[OCR] Total extracted length: {len(final)} chars")
    return final