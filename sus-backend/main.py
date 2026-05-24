from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyse      import router as analyse_router
from routes.apply_source import router as apply_source_router
from routes.translate    import router as translate_router
from routes.explain      import router as explain_router      # ← NEW


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
app.include_router(explain_router)           # ← NEW

@app.get("/")
def health():
    return {"status": "ok"}