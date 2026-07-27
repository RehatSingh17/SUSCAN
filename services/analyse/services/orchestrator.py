from pathlib import Path
from dotenv import load_dotenv

_HERE = Path(__file__).resolve()
for _parent in [_HERE.parent, _HERE.parent.parent, _HERE.parent.parent.parent]:
    _env = _parent / ".env"
    if _env.exists():
        load_dotenv(dotenv_path=_env, override=True)
        break
else:
    load_dotenv()

import os
import json
import logging
import requests
import time
import asyncio

import httpx
from concurrent.futures import ThreadPoolExecutor, as_completed, wait
from bs4 import BeautifulSoup
from services.groq_service import analyze_claim, LANGUAGE_NAMES, get_fallback_str

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_SERP_KEY = os.getenv("SERP_API_KEY")
if not _SERP_KEY:
    logger.error("❌ SERP_API_KEY is not set.")
else:
    logger.info(f"✅ SERP_API_KEY loaded ({_SERP_KEY[:6]}...)")

# ── Other-service URLs ─────────────────────────────────────────────────────
OCR_SERVICE_URL       = os.getenv("OCR_SERVICE_URL",       "http://ocr:8002")
RAG_SERVICE_URL       = os.getenv("RAG_SERVICE_URL",       "http://rag:8003")
TRANSLATE_SERVICE_URL = os.getenv("TRANSLATE_SERVICE_URL", "http://translate:8004")

# ─────────────────────────────────────────────
# 🔹 CONSTANTS
# ─────────────────────────────────────────────
MAX_ARTICLE_CHARS  = 1500
MAX_EXCERPT_CHARS  = 300
MAX_QUERY_WORDS    = 10
MAX_RESULTS        = 3
SCRAPE_TIMEOUT     = 4
SERP_TIMEOUT       = 8
SERP_NUM_RESULTS   = 2
MAX_SOURCES        = 6
MAX_SEARCH_WORKERS = 6
MAX_SCRAPE_WORKERS = 6
SCRAPE_HARD_LIMIT  = 4.5

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

BLOCKED_SIGNALS = [
    "enable js", "ad blocker", "please enable",
    "javascript required", "subscribe to read", "sign in to read",
]


# ─────────────────────────────────────────────
# 🔹 CROSS-SERVICE CALLS (httpx)
# ─────────────────────────────────────────────
async def call_ocr(image_bytes: bytes) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{OCR_SERVICE_URL}/ocr/extract",
            files={"file": ("image.jpg", image_bytes, "image/jpeg")},
        )
        resp.raise_for_status()
        return resp.json()["text"]


async def call_translate_detect(text: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{TRANSLATE_SERVICE_URL}/translate/detect",
            json={"text": text},
        )
        resp.raise_for_status()
        return resp.json()["language"]


async def call_translate_queries(text: str, target_languages: list = None) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{TRANSLATE_SERVICE_URL}/translate/queries",
            json={"text": text, "target_languages": target_languages},
        )
        resp.raise_for_status()
        return resp.json()


async def call_rag_search(query: str, language: str, top_k: int = MAX_RESULTS) -> tuple[list, bool]:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{RAG_SERVICE_URL}/rag/search",
                json={"query": query, "language": language, "top_k": top_k},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("results", []), data.get("hit", False)
    except Exception as e:
        logger.error(f"[RAG] search call failed: {e}")
        return [], False


async def call_rag_writeback(results: list) -> None:
    """Fire-and-forget write-back to the RAG service."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{RAG_SERVICE_URL}/rag/writeback",
                json={"results": results},
            )
            resp.raise_for_status()
            logger.info(f"[RAG] Write-back done: {resp.json()}")
    except Exception as e:
        logger.error(f"[RAG] Write-back failed (non-fatal): {e}")


# ─────────────────────────────────────────────
# 🔹 LOAD sources.json
# ─────────────────────────────────────────────
def load_sources() -> dict:
    this_file  = Path(__file__).resolve()
    candidates = [
        this_file.parent.parent / "sources.json",
        this_file.parent / "sources.json",
        Path.cwd() / "sources.json",
    ]
    for path in candidates:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            logger.info(f"✅ Loaded sources.json from: {path}")
            return data
    logger.error("❌ sources.json not found")
    return {
        "default": [
            {"name": "AP News",    "domain": "apnews.com",    "weight": 1.0, "scrapeable": True, "language": "en"},
            {"name": "BBC News",   "domain": "bbc.com",       "weight": 1.0, "scrapeable": True, "language": "en"},
            {"name": "Al Jazeera", "domain": "aljazeera.com", "weight": 0.9, "scrapeable": True, "language": "en"},
        ],
        "international": [],
        "states": {},
        "uts": {},
    }


# ─────────────────────────────────────────────
# 🔹 SELECT SOURCES
# ─────────────────────────────────────────────
def get_selected_sources(focus_regions: list) -> list:
    data = load_sources()
    seen = set()
    out  = []

    def add(source_list):
        for s in source_list:
            if s["domain"] not in seen:
                seen.add(s["domain"])
                out.append(s)

    add(data.get("default", []))
    for region in focus_regions:
        if region == "International":
            add(data.get("international", []))
        elif region in data.get("states", {}):
            add(data["states"][region])
        elif region in data.get("uts", {}):
            add(data["uts"][region])
        else:
            logger.warning(f"Unknown region: '{region}'")

    out.sort(key=lambda s: s.get("weight", 1.0), reverse=True)
    out = out[:MAX_SOURCES]
    logger.info(f"Selected {len(out)} sources (cap={MAX_SOURCES})")
    return out


# ─────────────────────────────────────────────
# 🔹 SCRAPE ARTICLE TEXT
# ─────────────────────────────────────────────
def get_article_text(url: str, scrapeable: bool = True) -> str:
    if not scrapeable:
        return ""
    try:
        resp = requests.get(url, headers=REQUEST_HEADERS, timeout=SCRAPE_TIMEOUT, stream=True)
        resp.raise_for_status()
        content = b""
        for chunk in resp.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > 80_000:
                break
        soup = BeautifulSoup(content, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
            tag.decompose()
        article = (
            soup.find("article")
            or soup.find("main")
            or soup.find("div", class_=lambda c: c and "content" in c.lower())
            or soup.find("body")
        )
        if not article:
            return ""
        text = " ".join(article.get_text(separator=" ", strip=True).split())
        if any(sig in text.lower() for sig in BLOCKED_SIGNALS):
            return ""
        return text[:MAX_ARTICLE_CHARS]
    except Exception:
        return ""


# ─────────────────────────────────────────────
# 🔹 RELEVANCE SCORE
# ─────────────────────────────────────────────
def score_article(query, title, snippet, full_text, date, weight=1.0) -> float:
    score = 0.0
    stop  = {"the","a","an","on","in","at","of","and","or","for","to","is","was","are"}
    words = [w for w in query.lower().split() if w not in stop and len(w) > 2]

    tl = title.lower(); sl = snippet.lower()
    fl = full_text.lower(); ql = query.lower()

    if ql in tl: score += 30
    if ql in sl: score += 20
    for w in words:
        if w in tl: score += 6
        if w in sl: score += 4
        if w in fl: score += 1

    dl = str(date).lower()
    if   "hour" in dl or "minute" in dl: score += 35
    elif "day"  in dl:                   score += 25
    elif "week" in dl:                   score += 15
    elif "month" in dl:                  score += 5
    elif "year" in dl:                   score -= 15

    return round(score * weight, 2)


# ─────────────────────────────────────────────
# 🔹 SEARCH ONE SOURCE (SerpAPI)
# ─────────────────────────────────────────────
def _search_one_source(source: dict, translated_queries: dict, api_key: str) -> list:
    source_language = source.get("language", "en")
    search_query = translated_queries.get(source_language, translated_queries.get("en", ""))
    full_query = f"{search_query} site:{source['domain']}"

    params = {
        "engine":  "google",
        "q":       full_query,
        "api_key": api_key,
        "num":     SERP_NUM_RESULTS,
        "hl":      source_language,
        "gl":      "in",
    }

    try:
        resp = requests.get("https://serpapi.com/search", params=params, timeout=SERP_TIMEOUT)
        resp.raise_for_status()
        organic = resp.json().get("organic_results", [])
        logger.info(f"[SerpAPI][{source['name']}] {len(organic)} results")
        return [
            {
                "link":    item.get("link", ""),
                "title":   item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "date":    item.get("date", "Unknown"),
                "matched": source,
            }
            for item in organic
        ]
    except Exception as e:
        logger.error(f"Search failed [{source['name']}]: {e}")
        return []


# ─────────────────────────────────────────────
# 🔹 SERPAPI SEARCH — fallback only
# ─────────────────────────────────────────────
def search_with_serpapi(
    query: str,
    selected_sources: list,
    translated_queries: dict,
    k: int = MAX_RESULTS,
) -> list:
    api_key = os.getenv("SERP_API_KEY")
    if not api_key:
        logger.error("SERP_API_KEY missing")
        return []

    logger.info("[SerpAPI] Running live search (RAG miss or empty index)")

    candidates = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=MAX_SEARCH_WORKERS) as ex:
        futures = {
            ex.submit(_search_one_source, src, translated_queries, api_key): src
            for src in selected_sources
        }
        for future in as_completed(futures):
            candidates.extend(future.result())

    logger.info(f"[SerpAPI] All searches done in {time.time()-t0:.1f}s — {len(candidates)} candidates")

    if not candidates:
        return []

    def scrape_candidate(c):
        text = get_article_text(c["link"], scrapeable=c["matched"].get("scrapeable", True))
        if not text or len(text.strip()) < 60:
            text = f"{c['title']}. {c['snippet']}"
        return text

    t1 = time.time()
    scraped = {}
    with ThreadPoolExecutor(max_workers=MAX_SCRAPE_WORKERS) as ex:
        future_to_c = {ex.submit(scrape_candidate, c): c for c in candidates}
        done, not_done = wait(future_to_c, timeout=SCRAPE_HARD_LIMIT)

        for future in done:
            c = future_to_c[future]
            try:
                scraped[c["link"]] = future.result()
            except Exception:
                scraped[c["link"]] = f"{c['title']}. {c['snippet']}"

        for future in not_done:
            future.cancel()
            c = future_to_c[future]
            scraped[c["link"]] = f"{c['title']}. {c['snippet']}"
            logger.warning(f"Scrape timed out (skipped): {c['link'][:60]}")

    logger.info(f"[SerpAPI] All scrapes done in {time.time()-t1:.1f}s — {len(done)} done, {len(not_done)} timed out")

    results = []
    for c in candidates:
        full_text = scraped.get(c["link"], f"{c['title']}. {c['snippet']}")
        matched   = c["matched"]
        score = score_article(
            query=query,
            title=c["title"],
            snippet=c["snippet"],
            full_text=full_text,
            date=c["date"],
            weight=matched.get("weight", 1.0),
        )
        results.append({
            "source":       matched["name"],
            "url":          c["link"],
            "title":        c["title"],
            "snippet":      c["snippet"],
            "date":         c["date"],
            "score":        score,
            "trust_weight": matched.get("weight", 1.0),
            "excerpt":      full_text[:MAX_EXCERPT_CHARS],
            "full_text":    full_text,
            "from_rag":     False,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    logger.info(f"[SerpAPI] Returning top {min(len(results), k)} of {len(results)} results")
    return results[:k]


# ─────────────────────────────────────────────
# 🔹 BUILD AI CONTEXT
# ─────────────────────────────────────────────
def build_context(search_results: list) -> tuple:
    parts = []
    dates = []
    for r in search_results[:3]:
        parts.append(
            f"SOURCE: {r['source']} (trust: {r.get('trust_weight', 1.0)})\n"
            f"DATE: {r['date']}\n"
            f"TITLE: {r['title']}\n"
            f"SNIPPET: {r['snippet']}\n"
            f"EXCERPT: {r['excerpt']}"
        )
        dates.append(r["date"])
    return "\n\n---\n\n".join(parts), dates


# ─────────────────────────────────────────────
# 🔹 LANGUAGE-AWARE FALLBACK BUILDER
# ─────────────────────────────────────────────
def _build_analysis_fallback(lang: str) -> dict:
    unavailable   = get_fallback_str(lang, "unavailable")
    no_verdict    = get_fallback_str(lang, "no_verdict")
    not_available = get_fallback_str(lang, "not_available")
    return {
        "event_recency":      "unclear",
        "truth_score":        0,
        "bias_detected":      False,
        "bias_types":         [],
        "missing_context":    not_available,
        "summary":            f"{unavailable}.",
        "reasoning":          f"{no_verdict}.",
        "final_verdict":      "unclear",
        "detected_language":  lang,
        "language_supported": lang in LANGUAGE_NAMES,
    }


# ─────────────────────────────────────────────
# 🔹 MAIN PIPELINE
# Flow:
#   1. OCR / clean text          (OCR service via HTTP if image)
#   2. Lang detect + source select (Translate service via HTTP + local sources.json)
#   3. RAG search (RAG service via HTTP)
#        ├─ HIT  → skip SerpAPI, go to step 5
#        └─ MISS → step 4
#   4. SerpAPI live search + scrape (local)
#        └─ write-back to RAG service via HTTP in background
#   5. Build context → Groq verdict (local)
# ─────────────────────────────────────────────
async def process_input(file=None, content=None, focus_regions: list = []) -> dict:
    if file and content:
        raise ValueError("Provide either file or content, not both.")

    from processors.text_cleaner import clean_text, word_count

    # ── Step 1: get raw text ──────────────────────────────────────────────────
    t_start = time.time()
    if file is not None:
        image_bytes = await file.read()
        raw_text    = await call_ocr(image_bytes)
        input_type  = "image"
        logger.info("Input: image (OCR via ocr-service)")
    elif content is not None:
        raw_text   = content
        input_type = "text"
        logger.info(f"Input: text — '{raw_text[:60]}'")
    else:
        raise ValueError("No input provided.")

    cleaned = clean_text(raw_text)
    if not cleaned or len(cleaned.strip()) < 3:
        raise ValueError("Input text too short after cleaning.")

    short_query = " ".join(cleaned.split()[:MAX_QUERY_WORDS])

    # ── Step 2: lang detect (translate service) + source select (local) ──────
    loop = asyncio.get_event_loop()

    detected_lang, selected_sources = await asyncio.gather(
        call_translate_detect(cleaned),
        loop.run_in_executor(None, get_selected_sources, focus_regions),
    )

    logger.info(f"Pipeline detected language: {detected_lang} in {time.time()-t_start:.1f}s")

    # ── Step 3: RAG search (primary path) ────────────────────────────────────
    t_rag = time.time()
    rag_results, rag_hit = await call_rag_search(
        query=short_query,
        language=detected_lang,
        top_k=MAX_RESULTS,
    )
    logger.info(f"[RAG] Done in {time.time()-t_rag:.2f}s — hit={rag_hit}")

    # ── Step 4: SerpAPI fallback (only on RAG miss) ───────────────────────────
    if rag_hit:
        search_results = rag_results
        logger.info("[RAG] Using cached results — SerpAPI skipped ✅")
    else:
        # Need translated queries for SerpAPI
        t2 = time.time()
        target_langs = list({s.get("language", "en") for s in selected_sources})
        translated_queries = await call_translate_queries(short_query, target_langs)
        logger.info(f"Translation done in {time.time()-t2:.1f}s — langs: {list(translated_queries.keys())}")

        t3 = time.time()
        live_results = await loop.run_in_executor(
            None,
            lambda: search_with_serpapi(
                query=short_query,
                selected_sources=selected_sources,
                translated_queries=translated_queries,
            )
        )
        logger.info(f"[SerpAPI] Search+scrape done in {time.time()-t3:.1f}s")

        # Merge: RAG weak hits + live results (RAG results go to back)
        search_results = live_results + [r for r in rag_results if r not in live_results]
        search_results = search_results[:MAX_RESULTS]

        # Write-back live results to RAG service in background (non-blocking)
        if live_results:
            asyncio.create_task(call_rag_writeback(live_results))

    # ── Step 5: Build context + AI verdict ───────────────────────────────────
    context_text, dates = build_context(search_results)

    t4 = time.time()
    try:
        analysis = await loop.run_in_executor(
            None, lambda: analyze_claim(
                claim=cleaned,
                context_text=context_text,
                dates=dates,
            )
        )
    except Exception as e:
        logger.error(f"AI error: {e}")
        analysis = _build_analysis_fallback(detected_lang)
    logger.info(f"AI verdict done in {time.time()-t4:.1f}s")

    logger.info(f"Total pipeline: {time.time()-t_start:.1f}s | source={'RAG' if rag_hit else 'SerpAPI'}")

    return {
        "input_type":        input_type,
        "focus_regions":     focus_regions,
        "raw_text":          raw_text,
        "cleaned_text":      cleaned,
        "detected_language": detected_lang,
        "word_count":        word_count(cleaned),
        "search_results":    search_results,
        "analysis":          analysis,
        "rag_hit":           rag_hit,
    }
