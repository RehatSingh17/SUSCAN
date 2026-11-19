import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.groq_service import explain_claim

logger = logging.getLogger(__name__)
router = APIRouter()


class ExplainRequest(BaseModel):
    claim:        str
    context_text: str  = ""
    language:     str  = "en"   # ISO code — same as detected_language


class ExplainResponse(BaseModel):
    explanation: str
    language:    str


@router.post("/explain", response_model=ExplainResponse)
async def explain(req: ExplainRequest):
    """
    Generate a detailed, neutral background explanation for a claim.
    Used by the 'Details' expandable section on the result page.
    """
    if not req.claim or not req.claim.strip():
        raise HTTPException(status_code=400, detail="claim is required")

    try:
        text = explain_claim(
            claim=req.claim,
            context_text=req.context_text,
            language=req.language,
        )
        return ExplainResponse(explanation=text, language=req.language)

    except Exception as e:
        logger.exception(f"[/explain] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))