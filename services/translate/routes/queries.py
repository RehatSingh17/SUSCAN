import logging
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services.translation_service import generate_multilingual_queries

logger = logging.getLogger(__name__)
router = APIRouter()


class QueriesRequest(BaseModel):
    text: str
    target_languages: Optional[List[str]] = None


@router.post("/translate/queries")
async def queries(req: QueriesRequest):
    """Generate multilingual search queries for the given text."""
    result = generate_multilingual_queries(req.text, req.target_languages)
    return result
