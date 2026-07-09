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

from concurrent.futures import ThreadPoolExecutor, as_completed, wait
from bs4 import BeautifulSoup
from processors.ocr import extract_text_from_image
from processors.text_cleaner import clean_text, word_count
from services.groq_service import analyze_claim, LANGUAGE_NAMES, get_fallback_str
from services.language_service import detect_language
from services.translation_service import generate_multilingual_queries

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_SERP_KEY = os.getenv("SERP_API_KEY")
if not _SERP_KEY:
    logger.error("❌ SERP_API_KEY is not set.")
else:
    logger.info(f"✅ SERP_API_KEY loaded ({_SERP_KEY[:6]}...)")

# ─────────────────────────────────────────────
# 🔹 CONSTANTS — tuned for <12s total
# ─────────────────────────────────────────────
MAX_ARTICLE_CHARS  = 1500   # ↓ from 2000 — less scrape text = faster LLM
MAX_EXCERPT_CHARS  = 300    # ↓ from 400
MAX_QUERY_WORDS    = 10     # ↓ from 12 — shorter query = faster SerpAPI
MAX_RESULTS        = 3      # ↓ from 5 — fewer results = faster scoring
SCRAPE_TIMEOUT     = 4      # ↓ from 6
SERP_TIMEOUT       = 8      # ↓ from 12
SERP_NUM_RESULTS   = 2
MAX_SOURCES        = 6      # ↓ from 8 — fewer parallel searches
MAX_SEARCH_WORKERS = 6
MAX_SCRAPE_WORKERS = 6
SCRAPE_HARD_LIMIT  = 4.5    # cancel scraping after this many seconds total

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
# 🔹 SCRAPE ARTICLE TEXT — fast, bails early
# ─────────────────────────────────────────────
def get_article_text(url: str, scrapeable: bool = True) -> str:
    if not scrapeable:
        return ""
    try:
        resp = requests.get(url, headers=REQUEST_HEADERS, timeout=SCRAPE_TIMEOUT,
                            stream=True)
        resp.raise_for_status()
        # Read only first 80KB — enough for the lede, avoids huge pages
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
# 🔹 SEARCH ONE SOURCE
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
        logger.info(f"[{source['name']}] {len(organic)} results")
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
# 🔹 SERPAPI SEARCH — parallel + hard scrape timeout
# ─────────────────────────────────────────────
def search_with_serpapi(query: str, selected_sources: list, translated_queries: dict,
                        k: int = MAX_RESULTS) -> list:
    api_key = os.getenv("SERP_API_KEY")
    if not api_key:
        logger.error("SERP_API_KEY missing")
        return []

    # ── Parallel SerpAPI searches ──
    candidates = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=MAX_SEARCH_WORKERS) as ex:
        futures = {
            ex.submit(_search_one_source, src, translated_queries, api_key): src
            for src in selected_sources
        }
        for future in as_completed(futures):
            candidates.extend(future.result())

    logger.info(f"All searches done in {time.time()-t0:.1f}s — {len(candidates)} candidates")

    if not candidates:
        return []

    # ── Parallel scraping with hard time limit ──
    def scrape_candidate(c):
        text = get_article_text(c["link"], scrapeable=c["matched"].get("scrapeable", True))
        if not text or len(text.strip()) < 60:
            text = f"{c['title']}. {c['snippet']}"
        return text

    t1 = time.time()
    scraped = {}
    with ThreadPoolExecutor(max_workers=MAX_SCRAPE_WORKERS) as ex:
        future_to_c = {ex.submit(scrape_candidate, c): c for c in candidates}

        # wait() never raises — it just returns done/not-done sets after the timeout
        done, not_done = wait(future_to_c, timeout=SCRAPE_HARD_LIMIT)

        # collect results from completed futures
        for future in done:
            c = future_to_c[future]
            try:
                scraped[c["link"]] = future.result()
            except Exception:
                scraped[c["link"]] = f"{c['title']}. {c['snippet']}"

        # cancel timed-out futures (best-effort) and fall back to snippet
        for future in not_done:
            future.cancel()
            c = future_to_c[future]
            scraped[c["link"]] = f"{c['title']}. {c['snippet']}"
            logger.warning(f"Scrape timed out (skipped): {c['link'][:60]}")

    logger.info(f"All scrapes done in {time.time()-t1:.1f}s — {len(done)} done, {len(not_done)} timed out")

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
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    logger.info(f"Returning top {min(len(results), k)} of {len(results)} results")
    return results[:k]


# ─────────────────────────────────────────────
# 🔹 BUILD AI CONTEXT
# ─────────────────────────────────────────────
def build_context(search_results: list) -> tuple:
    parts = []
    dates = []
    for r in search_results[:3]:
        parts.append(
            f"SOURCE: {r['source']} (trust: {r['trust_weight']})\n"
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
# 🔹 MAIN PIPELINE — concurrent lang+translate
# KEY OPTIMISATION: language detection and translation
# run in a thread pool alongside source selection,
# so nothing blocks sequentially.
# ─────────────────────────────────────────────
async def process_input(file=None, content=None, focus_regions: list = []) -> dict:
    if file and content:
        raise ValueError("Provide either file or content, not both.")

    # ── Step 1: get raw text ──
    t_start = time.time()
    if file is not None:
        image_bytes = await file.read()
        raw_text    = extract_text_from_image(image_bytes)
        input_type  = "image"
        logger.info("Input: image (OCR)")
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

    # ── Step 2: run lang detection + source selection concurrently ──
    loop = asyncio.get_event_loop()

    with ThreadPoolExecutor(max_workers=3) as pool:
        lang_future   = loop.run_in_executor(pool, detect_language, cleaned)
        source_future = loop.run_in_executor(pool, get_selected_sources, focus_regions)

        lang_info_raw, selected_sources = await asyncio.gather(lang_future, source_future)

    try:
        detected_lang = lang_info_raw.get("fallback", "en")
    except Exception:
        detected_lang = "en"

    logger.info(f"Pipeline detected language: {detected_lang} in {time.time()-t_start:.1f}s")

    # ── Step 3: translate query (uses detected lang) ──
    t2 = time.time()
    translated_queries = await loop.run_in_executor(
        None, generate_multilingual_queries, short_query
    )
    logger.info(f"Translation done in {time.time()-t2:.1f}s — langs: {list(translated_queries.keys())}")

    # ── Step 4: search + scrape ──
    t3 = time.time()
    search_results = await loop.run_in_executor(
        None,
        lambda: search_with_serpapi(
            query=short_query,
            selected_sources=selected_sources,
            translated_queries=translated_queries,
        )
    )
    logger.info(f"Search+scrape done in {time.time()-t3:.1f}s")

    context_text, dates = build_context(search_results)

    # ── Step 5: AI verdict ──
    t4 = time.time()
    try:
        analysis = await loop.run_in_executor(
            None, lambda: analyze_claim(claim=cleaned, context_text=context_text, dates=dates)
        )
    except Exception as e:
        logger.error(f"AI error: {e}")
        analysis = _build_analysis_fallback(detected_lang)
    logger.info(f"AI verdict done in {time.time()-t4:.1f}s")

    logger.info(f"Total pipeline: {time.time()-t_start:.1f}s")

    return {
        "input_type":        input_type,
        "focus_regions":     focus_regions,
        "raw_text":          raw_text,
        "cleaned_text":      cleaned,
        "detected_language": detected_lang,
        "word_count":        word_count(cleaned),
        "search_results":    search_results,
        "analysis":          analysis,
    }