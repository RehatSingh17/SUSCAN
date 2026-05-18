from dotenv import load_dotenv

# Load .env variables
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyse import router as analyse_router

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)

# Routes
app.include_router(analyse_router)


# Health check
@app.get("/")
def health():

    return {
        "status": "ok"
    }