import json
import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from services.orchestrator import process_input

logger = logging.getLogger(__name__)
router = APIRouter()


# ─────────────────────────────────────────────
# 🔹 JSON body schema (used by /analyse/text)
# ─────────────────────────────────────────────
class TextAnalyseRequest(BaseModel):
    content: str
    focus_regions: List[str] = []
    user_id: str = "anonymous"


# ─────────────────────────────────────────────
# 🔹 TEXT route  →  POST /analyse
#
# BUG FIX: The original single /analyse route used Form(...) for ALL
# parameters. FastAPI Form() only works with multipart/form-data.
# Postman (and the frontend for text) sends application/json, which
# makes FastAPI silently fail to parse the body → 500 with empty detail.
#
# Fix: split into two endpoints:
#   POST /analyse        → JSON body  (content as text)
#   POST /analyse/image  → multipart  (file upload)
# ─────────────────────────────────────────────
@router.post("/analyse")
async def analyse_text(req: TextAnalyseRequest):
    """
    Analyse a text claim.
    Accepts: application/json
    Body: { "content": "...", "focus_regions": [], "user_id": "..." }
    """
    try:
        if not req.content or not req.content.strip():
            raise HTTPException(status_code=400, detail="Empty text")

        result = await process_input(
            content=req.content,
            focus_regions=req.focus_regions,
        )

        return {"status": "success", "data": result}

    except HTTPException:
        raise  # re-raise 400s as-is

    except Exception as e:
        # BUG FIX: log the real error so you can see it in uvicorn console
        logger.exception(f"[/analyse] Unhandled error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# 🔹 IMAGE route  →  POST /analyse/image
#
# Kept as multipart/form-data because file uploads require it.
# focus_regions sent as a JSON string in the form field, e.g. '["Punjab"]'
# ─────────────────────────────────────────────
@router.post("/analyse/image")
async def analyse_image(
    file: UploadFile = File(...),
    focus_regions: str = Form(default="[]"),
    user_id: str = Form(default="anonymous"),
):
    """
    Analyse an image (OCR → claim extraction → analysis).
    Accepts: multipart/form-data
    Fields:  file, focus_regions (JSON string), user_id
    """
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Invalid image file type")

        # BUG FIX: wrap json.loads in try/except — bad JSON string from
        # frontend would previously bubble up as an unhandled 500
        try:
            parsed_regions = json.loads(focus_regions)
        except (json.JSONDecodeError, ValueError):
            parsed_regions = []

        result = await process_input(
            file=file,
            focus_regions=parsed_regions,
        )

        return {"status": "success", "data": result}

    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"[/analyse/image] Unhandled error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
