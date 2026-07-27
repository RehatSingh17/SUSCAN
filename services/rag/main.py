from dotenv import load_dotenv
load_dotenv()

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.search    import router as search_router
from routes.writeback import router as writeback_router
from routes.ingest     import router as ingest_router, run_and_record

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _start_scheduler(interval_hours: int = 4):
    """Start the background ingestion scheduler — runs run_and_record() every N hours,
    with an immediate first run so /rag/stats has data without waiting."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        scheduler = BackgroundScheduler(daemon=True)
        scheduler.add_job(
            func=run_and_record,
            trigger=IntervalTrigger(hours=interval_hours),
            id="rss_ingestion",
            name="RSS Ingestion Pipeline",
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=300,
        )
        scheduler.start()
        logger.info(f"[Ingestion] Scheduler started — runs every {interval_hours}h")

        threading.Thread(target=run_and_record, daemon=True).start()
        logger.info("[Ingestion] Initial ingestion run started in background")
        return scheduler
    except Exception as e:
        logger.error(f"[Ingestion] Failed to start scheduler: {e}")
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[startup] RAG service starting...")
    _start_scheduler()
    logger.info("[startup] RAG service ready — ingestion warming in background")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://suscan.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)
app.include_router(writeback_router)
app.include_router(ingest_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "rag"}
