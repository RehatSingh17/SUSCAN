from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.ocr import router as ocr_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _prewarm_readers():
    """Load priority OCR readers up front so the first real request is fast."""
    from processors.ocr import get_reader, READER_GROUPS
    for group in READER_GROUPS:
        get_reader(group)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[startup] OCR service starting — pre-warming readers...")
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _prewarm_readers)
        logger.info("[startup] OCR readers pre-warmed")
    except Exception as e:
        logger.warning(f"[startup] OCR pre-warm failed (non-fatal): {e}")
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

app.include_router(ocr_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ocr"}
