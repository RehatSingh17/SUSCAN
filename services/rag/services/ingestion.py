"""
services/ingestion.py
RSS ingestion pipeline for SUSCAN RAG.

What this does:
- Pulls latest articles from free RSS feeds of trusted sources
- Scrapes full article text (reuses existing BeautifulSoup logic)
- Runs NER to extract entities (people, locations, orgs)
- Chunks text + embeds + stores in ChromaDB
- Runs on a schedule via APScheduler (every 4 hours by default)
- Never touches SerpAPI — preserves the 200-250/month quota

To start the scheduler, call start_scheduler() from main.py on startup.
To run a one-off ingestion manually: python services/ingestion.py
"""

import logging
import time
import uuid
import hashlib
import re
from datetime import datetime, timezone
from typing import Optional

import requests
import feedparser
from bs4 import BeautifulSoup

from processors.ner import extract_entities
from services.vector_store import VectorStore, chunk_text

logger = logging.getLogger(__name__)

# ── Request headers (same as router.py) ──────────────────────────────────────
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

SCRAPE_TIMEOUT   = 8    # seconds per article
MAX_ARTICLE_CHARS = 3000
MIN_ARTICLE_CHARS = 150  # skip articles too short to be useful

BLOCKED_SIGNALS = [
    "enable js", "ad blocker", "please enable",
    "javascript required", "subscribe to read", "sign in to read",
]

# ── RSS Feed sources ──────────────────────────────────────────────────────────
# Only free, publicly accessible RSS feeds — no SerpAPI used here.
# Each entry: (source_name, feed_url, language)
# ── RSS_FEEDS for ingestion.py ────────────────────────────────────────────────
# Replace the existing RSS_FEEDS list in services/ingestion.py with this.
# Format: (source_name, feed_url, language_code)
# Total: 32 feeds across 7 languages covering national + Focus Mode regions

RSS_FEEDS = [

    # ── GLOBAL / NATIONAL ENGLISH (always relevant, high trust) ──────────────
    ("BBC News",          "http://feeds.bbci.co.uk/news/rss.xml",                         "en"),
    ("BBC World",         "http://feeds.bbci.co.uk/news/world/rss.xml",                   "en"),
    ("BBC India",         "http://feeds.bbci.co.uk/news/world/south_asia/rss.xml",        "en"),
    ("NDTV",              "https://feeds.feedburner.com/ndtvnews-top-stories",             "en"),
    ("India Today",       "https://www.indiatoday.in/rss/home",                           "en"),
    ("Hindustan Times",   "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", "en"),
    ("The Wire",          "https://thewire.in/feed",                                      "en"),
    ("Scroll",            "https://scroll.in/feed",                                       "en"),
    ("The Print",         "https://theprint.in/feed/",                                    "en"),

    # ── HINDI (covers BBC Hindi + major Hindi outlets) ────────────────────────
    ("BBC Hindi",         "https://feeds.bbci.co.uk/hindi/rss.xml",                       "hi"),
    ("NDTV Hindi",        "https://feeds.feedburner.com/ndtvkhabar-home",                 "hi"),
    ("Amar Ujala",        "https://www.amarujala.com/rss/breaking-news.xml",              "hi"),
    ("Navbharat Times",   "https://navbharattimes.indiatimes.com/rssfeedstopstories.cms", "hi"),
    ("Dainik Jagran",     "https://www.jagran.com/rss/national.xml",                      "hi"),

    # ── REGIONAL ENGLISH (Focus Mode — major states) ─────────────────────────
    # Punjab / Haryana / HP
    ("Tribune India",     "https://www.tribuneindia.com/rss/feed.xml",                    "en"),
    # Delhi / North India
    ("Hindustan Times Delhi", "https://www.hindustantimes.com/feeds/rss/delhi-news/rssfeed.xml", "en"),
    # Maharashtra
    ("Mumbai Mirror",     "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "en"),
    # Karnataka / South India
    ("Deccan Herald",     "https://www.deccanherald.com/rss-feeds/feed.xml",              "en"),
    # Kerala
    ("The Hindu Kerala",  "https://www.thehindu.com/news/national/kerala/feeder/default.rss", "en"),
    # Tamil Nadu
    ("The Hindu TN",      "https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss", "en"),
    # Andhra / Telangana
    ("Deccan Chronicle",  "https://www.deccanchronicle.com/rss_feed/",                   "en"),
    # West Bengal / Northeast
    ("Telegraph India",   "https://www.telegraphindia.com/feed",                          "en"),
    # J&K
    ("Greater Kashmir",   "https://www.greaterkashmir.com/feed/",                         "en"),

    # ── REGIONAL LANGUAGE (Focus Mode — script-specific) ─────────────────────
    # Telugu
    ("Eenadu",            "https://www.eenadu.net/rss.xml",                               "te"),
    # Bengali
    ("Anandabazar",       "https://www.anandabazar.com/rss",                              "bn"),
    # Kannada
    ("Prajavani",         "https://www.prajavani.net/feed",                               "kn"),
    # Urdu
    ("BBC Urdu",          "https://feeds.bbci.co.uk/urdu/rss.xml",                        "ur"),
    
    
    # ── FACT-CHECKING SPECIFIC ────────────────────────────────────────────────
    ("Alt News",          "https://www.altnews.in/feed/",                                 "en"),
    ("Boom Live",         "https://www.boomlive.in/feed",                                 "en"),
    ("Factly",            "https://factly.in/feed/",                                      "en"),
    ("Vishvas News",      "https://www.vishvasnews.com/feed/",                            "en"),

]


# ── Scrape one article URL ─────────────────────────────────────────────────────
def scrape_article(url: str) -> str:
    """
    Fetch and extract main text from an article URL.
    Returns empty string on failure or blocked content.
    """
    try:
        resp = requests.get(
            url, headers=REQUEST_HEADERS,
            timeout=SCRAPE_TIMEOUT, stream=True,
        )
        resp.raise_for_status()

        # Read only first 100KB to avoid huge pages
        content = b""
        for chunk in resp.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > 100_000:
                break

        soup = BeautifulSoup(content, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form", "figure"]):
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

        if len(text) < MIN_ARTICLE_CHARS:
            return ""

        return text[:MAX_ARTICLE_CHARS]

    except requests.exceptions.Timeout:
        logger.debug(f"[Ingestion] Timeout scraping: {url[:60]}")
        return ""
    except Exception as e:
        logger.debug(f"[Ingestion] Scrape error {url[:60]}: {e}")
        return ""


# ── Parse published date from RSS entry ───────────────────────────────────────
def _parse_date(entry) -> str:
    """Extract published date from feedparser entry, return YYYY-MM-DD string."""
    for attr in ("published_parsed", "updated_parsed", "created_parsed"):
        val = getattr(entry, attr, None)
        if val:
            try:
                return datetime(*val[:3]).strftime("%Y-%m-%d")
            except Exception:
                pass
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ── Generate stable event_id for a new article ────────────────────────────────
def _make_event_id(url: str) -> str:
    """Stable event ID derived from URL — same URL always gets same ID."""
    return "evt_" + hashlib.md5(url.encode()).hexdigest()[:10]


# ── Process one RSS feed ───────────────────────────────────────────────────────
def process_feed(
    source_name: str,
    feed_url: str,
    language: str,
    vs: VectorStore,
    max_articles: int = 10,
) -> int:
    """
    Fetch one RSS feed, scrape articles, extract entities, store in ChromaDB.

    Args:
        source_name:  Human-readable source name e.g. "Reuters"
        feed_url:     RSS feed URL
        language:     Language code "en", "hi", etc.
        vs:           VectorStore instance
        max_articles: Max articles to process per feed per run

    Returns:
        Number of chunks added to ChromaDB.
    """
    logger.info(f"[Ingestion] Processing feed: {source_name}")
    total_chunks = 0

    try:
        feed = feedparser.parse(feed_url)
    except Exception as e:
        logger.warning(f"[Ingestion] Failed to parse feed {source_name}: {e}")
        return 0

    if not feed.entries:
        logger.warning(f"[Ingestion] No entries in feed: {source_name}")
        return 0

    entries = feed.entries[:max_articles]
    logger.info(f"[Ingestion] {source_name}: {len(entries)} entries to process")

    for entry in entries:
        url = getattr(entry, "link", "") or getattr(entry, "url", "")
        if not url:
            continue

        title     = getattr(entry, "title", "")
        summary   = getattr(entry, "summary", "")
        published = _parse_date(entry)

        # Scrape full article text
        full_text = scrape_article(url)

        # Fall back to title + summary if scrape failed
        if not full_text:
            full_text = f"{title}. {summary}".strip()
            if len(full_text) < MIN_ARTICLE_CHARS:
                continue

        # NER on the full text (cap to 2000 chars for speed)
        entities = extract_entities(full_text[:2000], language=language)

        # Chunk the text
        text_chunks = chunk_text(full_text, chunk_size=400, overlap=50)

        event_id = _make_event_id(url)

        # Build chunk dicts for the vector store
        chunks_to_add = []
        for i, chunk in enumerate(text_chunks):
            chunks_to_add.append({
                "chunk_text":  chunk,
                "url":         url,
                "source":      source_name,
                "published":   published,
                "language":    language,
                "entities":    entities,
                "event_id":    event_id,
                "full_text":   full_text,
                "chunk_index": i,
            })

        added = vs.add_chunks(chunks_to_add)
        total_chunks += added

        # Small delay between articles to be polite to servers
        time.sleep(0.5)

    logger.info(f"[Ingestion] {source_name}: added {total_chunks} chunks")
    return total_chunks


# ── Full ingestion run (all feeds) ────────────────────────────────────────────
def run_ingestion(max_articles_per_feed: int = 10) -> dict:
    """
    Run a full ingestion cycle across all RSS feeds.
    Called by APScheduler every 4 hours, or manually.

    Returns:
        Summary dict with per-source chunk counts and total.
    """
    logger.info("=" * 60)
    logger.info("[Ingestion] Starting full ingestion run")
    logger.info("=" * 60)

    t_start = time.time()
    vs      = VectorStore()
    summary = {"sources": {}, "total_chunks": 0, "duration_s": 0}

    for source_name, feed_url, language in RSS_FEEDS:
        try:
            count = process_feed(
                source_name=source_name,
                feed_url=feed_url,
                language=language,
                vs=vs,
                max_articles=max_articles_per_feed,
            )
            summary["sources"][source_name] = count
            summary["total_chunks"] += count
        except Exception as e:
            logger.error(f"[Ingestion] Feed failed {source_name}: {e}")
            summary["sources"][source_name] = 0

        # Small delay between feeds
        time.sleep(1)

    # Run retention cleanup after ingestion
    try:
        vs.delete_old_chunks()
    except Exception as e:
        logger.error(f"[Ingestion] Retention cleanup failed: {e}")

    summary["duration_s"] = round(time.time() - t_start, 1)
    summary["total_stored"] = vs.count()
    summary["timestamp"] = datetime.now(timezone.utc).isoformat()

    logger.info(f"[Ingestion] Run complete in {summary['duration_s']}s")
    logger.info(f"[Ingestion] Total chunks added: {summary['total_chunks']}")
    logger.info(f"[Ingestion] Total chunks in DB: {summary['total_stored']}")

    return summary


# ── APScheduler setup ─────────────────────────────────────────────────────────
def start_scheduler(interval_hours: int = 4):
    """
    Start the background ingestion scheduler.
    Call this from main.py on startup.

    Runs run_ingestion() every `interval_hours` hours.
    First run fires immediately (run_date trick) so the index
    starts populating without waiting for the first interval.
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger

        scheduler = BackgroundScheduler(daemon=True)

        # Recurring job every N hours
        scheduler.add_job(
            func=run_ingestion,
            trigger=IntervalTrigger(hours=interval_hours),
            id="rss_ingestion",
            name="RSS Ingestion Pipeline",
            replace_existing=True,
            max_instances=1,        # never run two ingestions at once
            misfire_grace_time=300, # 5 min grace if server was busy
        )

        scheduler.start()
        logger.info(f"[Ingestion] Scheduler started — runs every {interval_hours}h")

        # Trigger first run immediately in a background thread
        import threading
        t = threading.Thread(target=run_ingestion, daemon=True)
        t.start()
        logger.info("[Ingestion] Initial ingestion run started in background")

        return scheduler

    except Exception as e:
        logger.error(f"[Ingestion] Failed to start scheduler: {e}")
        return None


# ── Manual run ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)s  %(message)s",
    )
    summary = run_ingestion(max_articles_per_feed=5)
    print("\n── Ingestion Summary ──")
    for source, count in summary["sources"].items():
        print(f"  {source:<25} {count} chunks")
    print(f"\n  Total chunks added : {summary['total_chunks']}")
    print(f"  Total in DB        : {summary['total_stored']}")
    print(f"  Duration           : {summary['duration_s']}s")