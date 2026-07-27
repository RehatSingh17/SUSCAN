# SUSCAN — Monolith to Microservices Migration

## Context

SUSCAN is an AI-powered multilingual fact-checking platform built with FastAPI
(Python 3.12) and React + Vite. It currently runs as a single FastAPI monolith.
This task migrates it to 4 containerized microservices orchestrated via
Docker Compose with an nginx API gateway.

**Current repo structure:**
```
sus-backend/
├── main.py
├── mcp/
│   └── router.py               ← orchestration pipeline
├── routes/
│   ├── analyse.py
│   ├── translate.py
│   ├── explain.py
│   └── apply_source.py
├── services/
│   ├── groq_service.py
│   ├── translation_service.py
│   ├── language_service.py
│   ├── vector_store.py
│   └── ingestion.py
├── processors/
│   ├── ocr.py
│   ├── ner.py
│   └── text_cleaner.py
├── sources.json
├── .env
└── requirements.txt

sus-frontend/                   ← React + Vite, DO NOT TOUCH
```

---

## Target Architecture

```
React Frontend
      │ HTTP
      ▼
nginx API Gateway (:80)
      │
      ├── /analyse/*    → Analyse Service  (:8001)
      ├── /ocr/*        → OCR Service      (:8002)
      ├── /rag/*        → RAG Service      (:8003)
      └── /translate/*  → Translate Service(:8004)

Redis ← shared message queue for async OCR jobs
ChromaDB ← shared persistent volume (mounted into RAG service only)
```

---

## Target Folder Structure

Create this structure at the repo root (alongside sus-frontend/):

```
sus-backend/                    ← DELETE or archive existing monolith
services/
├── analyse/
│   ├── main.py
│   ├── routes/
│   │   ├── analyse.py          ← /analyse and /analyse/image endpoints
│   │   └── explain.py          ← /explain endpoint
│   ├── services/
│   │   └── groq_service.py     ← copy unchanged from monolith
│   ├── processors/
│   │   └── text_cleaner.py     ← copy unchanged
│   ├── sources.json            ← copy unchanged
│   ├── requirements.txt
│   └── Dockerfile
│
├── ocr/
│   ├── main.py
│   ├── routes/
│   │   └── ocr.py              ← POST /ocr/extract → returns extracted text
│   ├── processors/
│   │   └── ocr.py              ← copy unchanged from monolith
│   ├── requirements.txt
│   └── Dockerfile
│
├── rag/
│   ├── main.py
│   ├── routes/
│   │   ├── search.py           ← POST /rag/search → returns chunks
│   │   ├── writeback.py        ← POST /rag/writeback → stores live results
│   │   └── ingest.py           ← POST /rag/ingest/run (manual trigger)
│   ├── services/
│   │   ├── vector_store.py     ← copy unchanged from monolith
│   │   └── ingestion.py        ← copy unchanged from monolith
│   ├── processors/
│   │   └── ner.py              ← copy unchanged from monolith
│   ├── requirements.txt
│   └── Dockerfile
│
└── translate/
    ├── main.py
    ├── routes/
    │   ├── translate.py        ← POST /translate (existing endpoint)
    │   └── detect.py           ← POST /translate/detect → returns lang code
    ├── services/
    │   ├── translation_service.py  ← copy unchanged
    │   └── language_service.py    ← copy unchanged
    ├── requirements.txt
    └── Dockerfile

nginx/
└── nginx.conf

docker-compose.yml              ← repo root
.env                            ← repo root (shared secrets)
```

---

## Service Responsibilities

### 1. Analyse Service (:8001) — orchestrator

- Receives all user-facing requests (`/analyse`, `/analyse/image`, `/explain`)
- Calls other services via HTTP (not direct function imports)
- Calls OCR service for images: `POST http://ocr:8002/ocr/extract`
- Calls RAG service for search: `POST http://rag:8003/rag/search`
- Calls Translate service for queries: `POST http://translate:8004/translate/queries`
- Calls RAG service for write-back: `POST http://rag:8003/rag/writeback`
- Calls Translate service for language detection: `POST http://translate:8004/translate/detect`
- Runs Groq verdict generation directly (groq_service.py is local to this service)
- Does NOT import from other services — HTTP only

### 2. OCR Service (:8002) — image processing

- Single endpoint: `POST /ocr/extract`
- Accepts: multipart form with image file OR base64 JSON body
- Returns: `{"text": "extracted text", "char_count": 123}`
- Contains: `processors/ocr.py` (copy unchanged)
- Preloads OCR readers on startup via lifespan event
- No other dependencies

### 3. RAG Service (:8003) — vector store + ingestion

- `POST /rag/search` — search ChromaDB, return ranked chunks
- `POST /rag/writeback` — store live search results in ChromaDB
- `POST /rag/ingest/run` — manual trigger for one ingestion cycle
- `GET  /rag/stats` — return chunk count, last ingestion time
- Contains: `vector_store.py`, `ingestion.py`, `ner.py` (all unchanged)
- APScheduler ingestion runs inside this service (not analyse)
- ChromaDB data directory mounted as Docker volume: `/data/chroma_db`
- Set env var: `CHROMA_DIR=/data/chroma_db`

### 4. Translate Service (:8004) — language + translation

- `POST /translate` — translate summary+reasoning (existing endpoint, unchanged)
- `POST /translate/detect` — detect language of input text
- `POST /translate/queries` — generate multilingual search queries
- Contains: `translation_service.py`, `language_service.py` (unchanged)

---

## Inter-Service Communication

The Analyse service calls others via `httpx` (async HTTP client).
Use `httpx.AsyncClient` with timeouts.

Service URLs come from environment variables:

```python
# In analyse/main.py or a config file
OCR_SERVICE_URL       = os.getenv("OCR_SERVICE_URL",       "http://ocr:8002")
RAG_SERVICE_URL       = os.getenv("RAG_SERVICE_URL",       "http://rag:8003")
TRANSLATE_SERVICE_URL = os.getenv("TRANSLATE_SERVICE_URL", "http://translate:8004")
```

Example call pattern in analyse service:

```python
import httpx

async def call_ocr(image_bytes: bytes) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{OCR_SERVICE_URL}/ocr/extract",
            files={"file": ("image.jpg", image_bytes, "image/jpeg")},
        )
        resp.raise_for_status()
        return resp.json()["text"]

async def call_rag_search(query: str, language: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{RAG_SERVICE_URL}/rag/search",
            json={"query": query, "language": language, "top_k": 3},
        )
        resp.raise_for_status()
        return resp.json()

async def call_translate_detect(text: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{TRANSLATE_SERVICE_URL}/translate/detect",
            json={"text": text},
        )
        resp.raise_for_status()
        return resp.json()["language"]
```

---

## Docker — each service needs a Dockerfile

All four Dockerfiles follow this pattern (adjust per service):

```dockerfile
FROM python:3.12-slim

# System deps — only OCR service needs libgl/libglib
# For OCR service add:
# RUN apt-get update && apt-get install -y libgl1-mesa-glx libglib2.0-0 \
#     libsm6 libxext6 libxrender-dev libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# OCR service only — download spaCy models
# RUN python -m spacy download en_core_web_sm
# RUN python -m spacy download xx_ent_wiki_sm

COPY . .
EXPOSE 800X   # 8001/8002/8003/8004
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "800X"]
```

---

## requirements.txt per service

### analyse/requirements.txt
```
fastapi
uvicorn
python-multipart
httpx              ← NEW: for calling other services
python-dotenv
groq
requests
beautifulsoup4
langdetect
```

### ocr/requirements.txt
```
fastapi
uvicorn
python-multipart
python-dotenv
easyocr
pillow
numpy==1.26.4      ← pin this, numpy 2.x breaks easyocr
```

### rag/requirements.txt
```
fastapi
uvicorn
python-multipart
python-dotenv
chromadb
sentence-transformers
spacy
feedparser
requests
beautifulsoup4
apscheduler
numpy==1.26.4
```

### translate/requirements.txt
```
fastapi
uvicorn
python-multipart
python-dotenv
groq
langdetect
```

---

## docker-compose.yml

```yaml
version: "3.9"

services:

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - analyse
      - ocr
      - rag
      - translate
    restart: always

  analyse:
    build: ./services/analyse
    env_file: .env
    environment:
      - OCR_SERVICE_URL=http://ocr:8002
      - RAG_SERVICE_URL=http://rag:8003
      - TRANSLATE_SERVICE_URL=http://translate:8004
    depends_on:
      - ocr
      - rag
      - translate
    restart: always

  ocr:
    build: ./services/ocr
    env_file: .env
    restart: always

  rag:
    build: ./services/rag
    env_file: .env
    environment:
      - CHROMA_DIR=/data/chroma_db
    volumes:
      - chroma_data:/data/chroma_db
    restart: always

  translate:
    build: ./services/translate
    env_file: .env
    restart: always

volumes:
  chroma_data:
```

---

## nginx/nginx.conf

```nginx
events { worker_connections 1024; }

http {
  upstream analyse  { server analyse:8001; }
  upstream ocr      { server ocr:8002; }
  upstream rag      { server rag:8003; }
  upstream translate{ server translate:8004; }

  server {
    listen 80;

    # increase timeout for OCR (can take 40s)
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;

    location /analyse  { proxy_pass http://analyse; }
    location /explain  { proxy_pass http://analyse; }
    location /ocr      { proxy_pass http://ocr; }
    location /rag      { proxy_pass http://rag; }
    location /translate{ proxy_pass http://translate; }

    location /health {
      return 200 'ok';
      add_header Content-Type text/plain;
    }
  }
}
```

---

## Health check endpoints

Every service must expose:

```python
@app.get("/health")
def health():
    return {"status": "ok", "service": "SERVICE_NAME"}
```

---

## Environment variables (.env at repo root)

```
GROQ_API_KEY=your_key_here
SERP_API_KEY=your_key_here
CHROMA_DIR=/data/chroma_db
CHROMA_RETENTION_DAYS=60
TRANSFORMERS_NO_TF=1
USE_TF=0
HF_HUB_DISABLE_SYMLINKS_WARNING=1
```

---

## CORS

Each service must allow the frontend origin.
Add to every `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

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
```

---

## Frontend change

In `sus-frontend`, change ONE line in the API config:

```javascript
// Before (monolith)
const API_BASE = "http://127.0.0.1:8000";

// After (microservices via nginx)
const API_BASE = "http://localhost:80";   // local dev
// OR
const API_BASE = "https://your-gcp-ip";  // production
```

---

## What must NOT change

- All service logic files (`groq_service.py`, `vector_store.py`,
  `ingestion.py`, `translation_service.py`, `language_service.py`,
  `ocr.py`, `ner.py`, `text_cleaner.py`) — copy them exactly as-is
- `sources.json` — copy into analyse service unchanged
- ChromaDB schema — no changes
- Firebase integration — stays in analyse service unchanged
- All frontend React code — only API_BASE URL changes

---

## Execution order for Claude Code

Work in this exact order to avoid dependency issues:

1. Create folder structure (mkdir only, no code yet)
2. Copy all unchanged service files into correct service folders
3. Write `translate` service (simplest — no heavy deps)
4. Write `rag` service (ChromaDB + ingestion)
5. Write `ocr` service (EasyOCR + preload)
6. Write `analyse` service (orchestrator — depends on all others)
7. Write all 4 Dockerfiles

8. Write docker-compose.yml
9. Write nginx.conf
10. Test each service independently: `uvicorn main:app --port 800X`
11. Test full stack: `docker-compose up --build`
12. Update frontend API_BASE

---

## Definition of done

- [ ] `docker-compose up --build` starts all 4 services + nginx with no errors
- [ ] `curl http://localhost/health` returns 200
- [ ] Text claim submitted from frontend returns verdict
- [ ] Image submitted from frontend returns verdict
- [ ] Translation buttons work on result page
- [ ] RAG search logs show either cache HIT or SerpAPI fallback
- [ ] Ingestion scheduler starts in RAG service on boot
- [ ] `GET /rag/stats` returns chunk count > 0 after first ingestion