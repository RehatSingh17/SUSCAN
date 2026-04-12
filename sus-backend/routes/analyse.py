from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from mcp.router import process_input

router = APIRouter()


@router.post("/analyse")
async def analyse(
    file: Optional[UploadFile] = File(None),
    content: Optional[str] = Form(None),
    user_id: str = Form(default="anonymous"),
):
    try:
        if file:
            if not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="Invalid image")

            result = await process_input(file=file)

        elif content:
            if not content.strip():
                raise HTTPException(status_code=400, detail="Empty text")

            result = await process_input(content=content)

        else:
            raise HTTPException(status_code=400, detail="No input")

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))