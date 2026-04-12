from processors.ocr import extract_text_from_image
from processors.text_cleaner import clean_text, word_count


async def process_input(file=None, content=None):
    """
    MCP Router:
    - If image → OCR → Cleaner
    - If text → Cleaner
    """

    # ── IMAGE FLOW ─────────────────────────────
    if file is not None:
        image_bytes = await file.read()

        raw_text = extract_text_from_image(image_bytes)
        cleaned = clean_text(raw_text)

        return {
            "input_type": "image",
            "raw_text": raw_text,
            "cleaned_text": cleaned,
            "word_count": word_count(cleaned),
        }

    # ── TEXT FLOW ──────────────────────────────
    if content is not None:
        cleaned = clean_text(content)

        return {
            "input_type": "text",
            "raw_text": content,
            "cleaned_text": cleaned,
            "word_count": word_count(cleaned),
        }

    raise ValueError("No input provided")