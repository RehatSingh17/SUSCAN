import io
import easyocr
from PIL import Image

_reader = None


def get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(["en"], gpu=False)
    return _reader


def extract_text_from_image(image_bytes: bytes) -> str:
    reader = get_reader()

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Invalid image file: {e}")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    results = reader.readtext(img_bytes)

    if not results:
        return ""

    results.sort(key=lambda r: r[0][0][1])

    filtered = [text for (_, text, conf) in results if conf > 0.3]

    return " ".join(filtered)