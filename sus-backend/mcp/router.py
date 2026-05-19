
from pathlib import Path
from dotenv import load_dotenv

# Walk up from this file to find .env at project root
_HERE = Path(__file__).resolve()
for _parent in [_HERE.parent, _HERE.parent.parent, _HERE.parent.parent.parent]:
    _env = _parent / ".env"
    if _env.exists():
        load_dotenv(dotenv_path=_env, override=True)
        break
else:
    load_dotenv()  # fallback: search cwd

import os
import json
import logging
import requests
import time

from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup
from processors.ocr import extract_text_from_image
from processors.text_cleaner import clean_text, word_count
from services.groq_service import analyze_claim

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Validate critical env vars at startup so you see the problem immediately
_SERP_KEY = os.getenv("SERP_API_KEY")
if not _SERP_KEY:
    logger.error("❌ SERP_API_KEY is not set. Check your .env file location.")
else:
    logger.info(f"✅ SERP_API_KEY loaded ({_SERP_KEY[:6]}...)")


# ─────────────────────────────────────────────
# 🔹 CONSTANTS
# ─────────────────────────────────────────────
MAX_ARTICLE_CHARS = 2000
MAX_EXCERPT_CHARS = 400
MAX_QUERY_WORDS   = 15
MAX_RESULTS       = 5
SCRAPE_TIMEOUT    = 10

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
    """
    Find and load sources.json from the project tree.
    Checks: sus-backend/, sus-backend/mcp/, and cwd.
    """
    this_file = Path(__file__).resolve()
    candidates = [
        this_file.parent.parent / "sources.json",   # sus-backend/sources.json  ✅ most likely
        this_file.parent / "sources.json",           # sus-backend/mcp/sources.json
        Path.cwd() / "sources.json",                 # wherever uvicorn was launched
    ]

    for path in candidates:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            logger.info(f"✅ Loaded sources.json from: {path}")
            return data

    logger.error("❌ sources.json not found in any expected location:")
    for c in candidates:
        logger.error(f"   tried: {c}")

    # safe fallback so the app doesn't crash
    return {
        "default": [
            {"name": "AP News",    "domain": "apnews.com",    "weight": 1.0, "scrapeable": True},
            {"name": "BBC News",   "domain": "bbc.com",       "weight": 1.0, "scrapeable": True},
            {"name": "Al Jazeera", "domain": "aljazeera.com", "weight": 0.9, "scrapeable": True},
        ],
        "international": [],
        "states": {},
        "uts": {},
    }


# ─────────────────────────────────────────────
# 🔹 SELECT SOURCES FOR FOCUS REGIONS
# ─────────────────────────────────────────────
def get_selected_sources(focus_regions: list) -> list:
    """
    Always include default sources.
    Merge in region-specific sources based on focus_regions.
    Deduplicates by domain so no source appears twice.
    """
    data = load_sources()
    seen  = set()
    out   = []

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
            logger.warning(f"Unknown region in focus_regions: '{region}'")

    logger.info(
        f"Selected {len(out)} sources "
        f"(regions: {focus_regions if focus_regions else ['default']})"
    )
    return out


# ─────────────────────────────────────────────
# 🔹 SCRAPE ARTICLE TEXT
# ─────────────────────────────────────────────
def get_article_text(url: str, scrapeable: bool = True) -> str:
    """
    Scrape and return clean article text.
    Returns '' immediately for non-scrapeable sources.
    """
    if not scrapeable:
        logger.info(f"Skip (non-scrapeable): {url}")
        return ""

    try:
        resp = requests.get(url, headers=REQUEST_HEADERS, timeout=SCRAPE_TIMEOUT)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script","style","nav","footer","header","aside","form"]):
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
            logger.info(f"Skip (paywall/block): {url}")
            return ""

        return text[:MAX_ARTICLE_CHARS]

    except requests.exceptions.Timeout:
        logger.info(f"Skip (timeout): {url}")
        return ""
    except requests.exceptions.HTTPError as e:
        logger.info(f"Skip (HTTP {e.response.status_code}): {url}")
        return ""
    except Exception as e:
        logger.error(f"Scrape error {url}: {e}")
        return ""


# ─────────────────────────────────────────────
# 🔹 RELEVANCE SCORE
# ─────────────────────────────────────────────
def score_article(
    query: str,
    title: str,
    snippet: str,
    full_text: str,
    date: str,
    weight: float = 1.0,
) -> float:

    score = 0.0
    stop  = {"the","a","an","on","in","at","of","and","or","for","to","is","was","are"}
    words = [w for w in query.lower().split() if w not in stop and len(w) > 2]

    tl = title.lower();   sl = snippet.lower()
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
# 🔹 SERPAPI SEARCH
# ─────────────────────────────────────────────
def search_with_serpapi(
    query: str,
    selected_sources: list,
    k: int = MAX_RESULTS,
) -> list:

    api_key = os.getenv("SERP_API_KEY")
    if not api_key:
        logger.error("SERP_API_KEY missing — cannot search.")
        return []

    # Build site: filter from selected sources
    site_filter = " OR ".join(f"site:{s['domain']}" for s in selected_sources)
    full_query  = f"{query} ({site_filter})"

    params = {
        "engine":  "google",
        "q":       full_query,
        "api_key": api_key,
        "num":     k * 3,   # fetch more, filter down after scraping
        "hl":      "en",
        "gl":      "in",
    }

    logger.info(f"SerpAPI query: {full_query[:120]}...")

    try:
        resp = requests.get(
            "https://serpapi.com/search",
            params=params,
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.error(f"SerpAPI request failed: {e}")
        return []

    organic = data.get("organic_results", [])
    logger.info(f"SerpAPI returned {len(organic)} organic results")

    # O(1) domain lookup
    domain_map = {s["domain"]: s for s in selected_sources}

    # ── Match organic results to sources ──────────────────────────────────────
    candidates = []
    for item in organic:
        link    = item.get("link", "")
        title   = item.get("title", "")
        snippet = item.get("snippet", "")
        date    = item.get("date", "Unknown")

        matched = None
        for domain, source in domain_map.items():
            if domain in link:
                matched = source
                break

        if not matched:
            logger.info(f"No source match for: {link}")
            continue

        candidates.append({
            "link": link, "title": title,
            "snippet": snippet, "date": date,
            "matched": matched,
        })

    # ── Scrape ALL articles in parallel ──────────────────────────────────────
    # Instead of scraping one-by-one (slow), fire all requests at once.
    # 5 articles × ~3s each = 15s sequential → ~3s parallel
    def scrape_candidate(c):
        t0 = time.time()
        full_text = get_article_text(
            c["link"],
            scrapeable=c["matched"].get("scrapeable", True),
        )
        if not full_text or len(full_text.strip()) < 80:
            full_text = f"{c['title']}. {c['snippet']}"
            logger.info(f"Fallback used for: {c['link']}")
        logger.info(f"Scraped in {time.time()-t0:.1f}s: {c['link'][:60]}")
        return full_text

    # Max 8 threads — enough for 9 results without hammering servers
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(scrape_candidate, c): c for c in candidates}
        scraped = {}
        for future in as_completed(futures):
            c = futures[future]
            scraped[c["link"]] = future.result()

    # ── Build results list ────────────────────────────────────────────────────
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
    logger.info(f"Returning {min(len(results), k)}/{len(results)} results after filtering")
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
# 🔹 MAIN PIPELINE
# ─────────────────────────────────────────────
async def process_input(
    file=None,
    content=None,
    focus_regions: list = [],
) -> dict:

    if file and content:
        raise ValueError("Provide either file or content, not both.")

    # ── Input ─────────────────────────────────
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

    # ── Clean ─────────────────────────────────
    cleaned = clean_text(raw_text)
    if not cleaned or len(cleaned.strip()) < 3:
        raise ValueError("Input text too short after cleaning.")

    short_query = " ".join(cleaned.split()[:MAX_QUERY_WORDS])

    # ── Sources ───────────────────────────────
    selected_sources = get_selected_sources(focus_regions)

    # ── Search ────────────────────────────────
    search_results = search_with_serpapi(
        query=short_query,
        selected_sources=selected_sources,
    )

    # ── Context + AI ──────────────────────────
    context_text, dates = build_context(search_results)

    try:
        analysis = analyze_claim(
            claim=cleaned,
            context_text=context_text,
            dates=dates,
        )
    except Exception as e:
        logger.error(f"AI error: {e}")
        analysis = {
            "event_recency":  "unclear",
            "truth_score":    0,
            "bias_detected":  False,
            "bias_types":     [],
            "missing_context": "AI unavailable",
            "summary":        "AI analysis temporarily unavailable.",
            "reasoning":      "AI reasoning temporarily unavailable.",
            "final_verdict":  "unclear",
        }

    return {
        "input_type":     input_type,
        "focus_regions":  focus_regions,
        "raw_text":       raw_text,
        "cleaned_text":   cleaned,
        "word_count":     word_count(cleaned),
        "search_results": search_results,
        "analysis":       analysis,
    }