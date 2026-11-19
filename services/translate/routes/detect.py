import logging

from fastapi import APIRouter
from pydantic import BaseModel

from services.language_service import detect_language

logger = logging.getLogger(__name__)
router = APIRouter()


class DetectRequest(BaseModel):
    text: str


class DetectResponse(BaseModel):
    language: str
    detected: str
    supported: bool


@router.post("/translate/detect", response_model=DetectResponse)
async def detect(req: DetectRequest):
    """Detect language of input text. `language` is the fallback code to use downstream."""
    info = detect_language(req.text)
    return DetectResponse(
        language=info["fallback"],
        detected=info["detected"],
        supported=info["supported"],
    )
