import time
import logging
import threading

from fastapi import APIRouter
from pydantic import BaseModel

from services.vector_store import VectorStore

logger = logging.getLogger(__name__)
router = APIRouter()

# ── RAG config ────────────────────────────────────────────────────────────────
RAG_HIT_THRESHOLD = 0.72
RAG_MIN_RESULTS   = 2
MAX_EXCERPT_CHARS = 300

_vs = None
_vs_failed = False
_vs_lock = threading.Lock()


def _get_vector_store(block: bool = True):
    """
    Shared VectorStore, loaded exactly once under a lock (startup preload and
    request threads can no longer load the embedding model twice).

    block=False -> if another thread is still loading it, return None at once
    instead of making the caller wait. Search uses this so a warming index
    shows up as a fast miss, not a 15 s timeout.
    """
    global _vs, _vs_failed
    if _vs is not None:
        return _vs
    if _vs_failed:
        return None
    if not block and _vs_lock.locked():
        return None
    with _vs_lock:
        if _vs is not None:
            return _vs
        if _vs_failed:
            return None
        try:
            _vs = VectorStore()
            logger.info(f"[RAG] VectorStore ready — {_vs.count()} chunks in index")
            return _vs
        except Exception as e:
            logger.warning(f"[RAG] VectorStore unavailable: {e}")
            _vs_failed = True
            return None


def _rag_to_search_results(rag_results: list) -> list:
    out = []
    for r in rag_results:
        full_text = r.get("full_text") or r.get("chunk_text", "")
        out.append({
            "source":       r.get("source", "Cached"),
            "url":          r.get("url", ""),
            "title":        r.get("chunk_text", "")[:120],
            "snippet":      r.get("chunk_text", "")[:300],
            "date":         r.get("published", "Unknown"),
            "score":        round(r.get("similarity", 0) * 100, 1),
            "trust_weight": 1.0,
            "excerpt":      full_text[:MAX_EXCERPT_CHARS],
            "full_text":    full_text,
            "from_rag":     True,
        })
    return out


class SearchRequest(BaseModel):
    query: str
    language: str = "en"
    top_k: int = 3


# NOTE: plain `def`, not `async def` — FastAPI runs it in a worker thread, so the
# embedding + Chroma work no longer freezes the event loop for every other request.
@router.post("/rag/search")
def search(req: SearchRequest):
    """
    Returns {"results": [...], "hit": bool}. hit=True -> caller skips SerpAPI.
    While the index is still warming it answers immediately with a miss.
    """
    vs = _get_vector_store(block=True)
    if vs is None:
        logger.info("[RAG] Index warming or unavailable — fast miss")
        return {"results": [], "hit": False}

    if vs.is_empty():
        logger.info("[RAG] Index is empty — miss")
        return {"results": [], "hit": False}

    try:
        t0 = time.time()
        rag_results = vs.search(
            query_text=req.query,
            query_language=req.language,
            top_k=req.top_k,
            apply_entity_filter=True,
        )
        logger.info(f"[RAG] Search done in {time.time()-t0:.2f}s — {len(rag_results)} results")

        if not rag_results:
            logger.warning(
                "[RAG] No results returned. "
                "Check similarity threshold and vector retrieval."
            )
            return {"results": [], "hit": False}

        top_similarity = rag_results[0].get("similarity", 0)
        if top_similarity < RAG_HIT_THRESHOLD or len(rag_results) < RAG_MIN_RESULTS:
            logger.info(
                f"[RAG] Weak hit (top sim={top_similarity:.2f}, count={len(rag_results)})"
            )
            return {"results": _rag_to_search_results(rag_results), "hit": False}

        logger.info(
            f"[RAG] Cache HIT — top similarity={top_similarity:.2f}, "
            f"{len(rag_results)} results"
        )
        return {"results": _rag_to_search_results(rag_results), "hit": True}

    except Exception as e:
        logger.error(f"[RAG] Search failed: {e}")
        return {"results": [], "hit": False}