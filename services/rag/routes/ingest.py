import logging

from fastapi import APIRouter

from services.ingestion import run_ingestion
from routes.search import _get_vector_store

logger = logging.getLogger(__name__)
router = APIRouter()

_last_ingestion = {"summary": None}


def run_and_record() -> dict:
    """Run one ingestion cycle and record it for GET /rag/stats."""
    summary = run_ingestion()
    _last_ingestion["summary"] = summary
    return summary


@router.post("/rag/ingest/run")
def ingest_run():
    """Manual trigger for one ingestion cycle."""
    return run_and_record()


@router.get("/rag/stats")
def stats():
    last = _last_ingestion["summary"]
    vs = _get_vector_store(block=False)
    return {
        "status":          "ready" if vs is not None else "warming",
        "chunk_count":     vs.count() if vs is not None else None,
        "last_ingestion":  last.get("timestamp") if last else None,
        "last_ingestion_summary": last,
    }