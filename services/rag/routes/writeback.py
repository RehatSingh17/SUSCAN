import logging
from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel

from routes.search import _get_vector_store

logger = logging.getLogger(__name__)
router = APIRouter()


class WritebackRequest(BaseModel):
    results: List[Dict[str, Any]]


@router.post("/rag/writeback")
async def writeback(req: WritebackRequest):
    """Store live search results in ChromaDB (cache-aside write-back)."""
    vs = _get_vector_store()
    if vs is None:
        return {"added": 0}

    live_results = [r for r in req.results if not r.get("from_rag")]
    if not live_results:
        return {"added": 0}

    try:
        added = vs.write_back(live_results)
        return {"added": added}
    except Exception as e:
        logger.error(f"[RAG] Write-back failed: {e}")
        return {"added": 0}
