import time
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from services.vector_store import VectorStore

logger = logging.getLogger(__name__)
router = APIRouter()

# ── RAG config (moved unchanged from mcp/router.py) ───────────────────────────
RAG_HIT_THRESHOLD = 0.72
RAG_MIN_RESULTS   = 2
MAX_EXCERPT_CHARS = 300

_vs = None
_vs_failed = False  # if ChromaDB fails once, skip it for the rest of the session


def _get_vector_store():
    """Lazy-load VectorStore. Returns None if ChromaDB/embedder is unavailable."""
    global _vs, _vs_failed
    if _vs_failed:
        return None
    if _vs is not None:
        return _vs
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


@router.post("/rag/search")
async def search(req: SearchRequest):
    """
    Search ChromaDB for relevant chunks.
    Returns {"results": [...], "hit": bool} — hit=True means the caller
    should skip SerpAPI, hit=False means fall back to a live search.
    """
    vs = _get_vector_store()
    if vs is None:
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
            logger.info("[RAG] Miss — no results above threshold")
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
