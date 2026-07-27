from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyse      import router as analyse_router
from routes.apply_source import router as apply_source_router
from routes.translate    import router as translate_router
from routes.explain      import router as explain_router

logger = logging.getLogger(__name__)

app = FastAPI()

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

app.include_router(analyse_router)
app.include_router(apply_source_router)
app.include_router(translate_router)
app.include_router(explain_router)


async def _prewarm_ocr():
    """Load priority OCR readers in background — non-blocking."""
    try:
        from processors.ocr import prewarm_readers
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, prewarm_readers)
    except Exception as e:
        logger.warning(f"[startup] OCR pre-warm failed (non-fatal): {e}")


async def _start_ingestion():
    """Start RSS ingestion scheduler in background — non-blocking."""
    try:
        from services.ingestion import start_scheduler
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, start_scheduler)
    except Exception as e:
        logger.warning(f"[startup] Ingestion scheduler failed to start (non-fatal): {e}")


@app.on_event("startup")
async def startup():
    logger.info("[startup] Server starting...")

    # Both run in background — server is ready immediately
    asyncio.create_task(_prewarm_ocr())
    asyncio.create_task(_start_ingestion())

    logger.info("[startup] Server ready — OCR and ingestion warming in background")


@app.get("/")
def health():
    return {"status": "ok"}