from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyse import router as analyse_router
from routes.apply_source import router as apply_source_router  # ← ADD THIS


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
app.include_router(apply_source_router)  # ← ADD THIS

@app.get("/")
def health():
    return {"status": "ok"}