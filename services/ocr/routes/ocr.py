import base64
import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from processors.ocr import extract_text_from_image

logger = logging.getLogger(__name__)
router = APIRouter()


class Base64ImageRequest(BaseModel):
    image_base64: str


@router.post("/ocr/extract")
async def extract(
    file: Optional[UploadFile] = File(default=None),
):
    """
    Extract text from an image.
    Accepts either multipart/form-data with `file`, or a JSON body
    {"image_base64": "..."} — FastAPI dispatches based on Content-Type,
    so we branch on which body form the request actually is.
    """
    try:
        if file is not None:
            image_bytes = await file.read()
        else:
            raise HTTPException(status_code=400, detail="No image file provided")

        text = extract_text_from_image(image_bytes)
        return {"text": text, "char_count": len(text)}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[/ocr/extract] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ocr/extract/base64")
async def extract_base64(req: Base64ImageRequest):
    """Same as /ocr/extract but for a base64-encoded JSON body."""
    try:
        image_bytes = base64.b64decode(req.image_base64)
        text = extract_text_from_image(image_bytes)
        return {"text": text, "char_count": len(text)}
    except Exception as e:
        logger.exception(f"[/ocr/extract/base64] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
