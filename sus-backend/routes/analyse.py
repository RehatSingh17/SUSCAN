from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException
)

from typing import Optional

import json

from mcp.router import process_input

router = APIRouter()


@router.post("/analyse")
async def analyse(

    file: Optional[UploadFile] = File(None),

    content: Optional[str] = Form(None),

    user_id: str = Form(default="anonymous"),

    focus_regions: str = Form(default="[]")
):

    try:

        # parse regions from frontend
        parsed_regions = json.loads(
            focus_regions
        )

        # ─────────────────────────────────────
        # IMAGE FLOW
        # ─────────────────────────────────────
        if file:

            if not file.content_type.startswith(
                "image/"
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid image"
                )

            result = await process_input(
                file=file,
                focus_regions=parsed_regions
            )

        # ─────────────────────────────────────
        # TEXT FLOW
        # ─────────────────────────────────────
        elif content:

            if not content.strip():

                raise HTTPException(
                    status_code=400,
                    detail="Empty text"
                )

            result = await process_input(
                content=content,
                focus_regions=parsed_regions
            )

        else:

            raise HTTPException(
                status_code=400,
                detail="No input"
            )

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )