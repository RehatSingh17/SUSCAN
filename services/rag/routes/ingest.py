import logging

from fastapi import APIRouter

from services.ingestion import run_ingestion
from services.vector_store import VectorStore

logger = logging.getLogger(__name__)
router = APIRouter()

_last_ingestion = {"summary": None}


def run_and_record() -> dict:
    """Run one ingestion cycle and record it for GET /rag/stats."""
    summary = run_ingestion()
    _last_ingestion["summary"] = summary
    return summary


@router.post("/rag/ingest/run")
async def ingest_run():
    """Manual trigger for one ingestion cycle."""
    summary = run_and_record()
    return summary


@router.get("/rag/stats")
async def stats():
    vs = VectorStore()
    last = _last_ingestion["summary"]
    return {
        "chunk_count":     vs.count(),
        "last_ingestion":  last.get("timestamp") if last else None,
        "last_ingestion_summary": last,
    }
