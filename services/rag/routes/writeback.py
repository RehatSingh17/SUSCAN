
import logging
from typing import Any, Dict, List

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, Field

from routes.search import _get_vector_store

logger = logging.getLogger(__name__)
router = APIRouter()


class WritebackRequest(BaseModel):
    results: List[Dict[str, Any]] = Field(default_factory=list)
    claim: str = ""
    analysis: Dict[str, Any] = Field(default_factory=dict)
    language: str = "en"


def _store(
    results: List[Dict[str, Any]],
    claim: str,
    analysis: Dict[str, Any],
    language: str,
) -> None:
    """Store live articles and completed claim analysis in the background."""
    try:
        vs = _get_vector_store()
        if vs is None:
            logger.error("[RAG] VectorStore unavailable")
            return

        # Store only newly fetched articles, not articles retrieved from RAG.
        live_results = [r for r in results if not r.get("from_rag")]

        if live_results:
            added = vs.write_back(live_results)
            logger.info(
                f"[RAG] Stored {added} article chunks "
                f"from {len(live_results)} live results"
            )

        # Avoid saving failed or incomplete AI analyses.
        verdict = str(analysis.get("final_verdict", "")).lower()

        if claim.strip() and analysis and verdict not in ("", "unclear"):
            saved = vs.write_claim(
                claim=claim,
                analysis=analysis,
                language=language,
                evidence_results=results,
            )
            logger.info(f"[RAG] Claim write-back: {saved}")

    except Exception as e:
        logger.exception(f"[RAG] Write-back failed: {e}")


@router.post("/rag/writeback")
def writeback(req: WritebackRequest, background: BackgroundTasks):
    background.add_task(
        _store,
        req.results,
        req.claim,
        req.analysis,
        req.language,
    )
    return {
        "queued": True,
        "articles_received": len(req.results),
        "claim_received": bool(req.claim.strip()),
    }
