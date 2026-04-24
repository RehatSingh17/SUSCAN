from processors.ocr import extract_text_from_image
from processors.text_cleaner import clean_text, word_count

import json
import requests
from bs4 import BeautifulSoup


# ─────────────────────────────────────────────
# 🔹 Load trusted sources
# ─────────────────────────────────────────────
def load_sources():
    with open("sources.json", "r", encoding="utf-8") as f:
        return json.load(f)


# ─────────────────────────────────────────────
# 🔹 Extract full article text
# ─────────────────────────────────────────────
def get_article_text(url: str):
    try:
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        }

        res = requests.get(url, headers=headers, timeout=10)

        soup = BeautifulSoup(res.text, "html.parser")

        # Remove unwanted elements
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        article = soup.find("article") or soup.find("main") or soup.find("body")
        if not article:
            return ""

        text = article.get_text(separator=" ", strip=True)
        return text[:2000]

    except Exception as e:
        print("Scrape error:", e)
        return ""


# ─────────────────────────────────────────────
# 🔹 Search + scrape articles (FIXED)
# ─────────────────────────────────────────────
def search_articles(query: str, k: int = 5):
    sources = load_sources()
    results = []

    headers = {"User-Agent": "Mozilla/5.0"}

    query_words = set(query.lower().split())

    for source in sources:
        try:
            res = requests.get(f"https://{source['domain']}", headers=headers, timeout=10)
            soup = BeautifulSoup(res.text, "html.parser")

            links = []
            for a in soup.select("a[href]"):
                href = a.get("href")

                if not href:
                    continue

                if href.startswith("/"):
                    href = f"https://{source['domain']}{href}"

                if source["domain"] in href and href.count("/") > 3:
                    links.append(href)

            links = list(set(links))[:5]

            for link in links:
                text = get_article_text(link)

                if not text:
                    continue

                # 🔥 KEY FIX: relevance check
                text_lower = text.lower()

                match_score = sum(1 for word in query_words if word in text_lower)

                if match_score >= 3:  # threshold
                    results.append({
                        "source": source["name"],
                        "url": link,
                        "text": text[:1000],
                        "score": match_score
                    })

            if len(results) >= k:
                break

        except Exception as e:
            print("Search error:", e)

    # sort by relevance
    results.sort(key=lambda x: x["score"], reverse=True)

    return results[:k]

# ─────────────────────────────────────────────
# 🔹 MAIN ROUTER FUNCTION
# ─────────────────────────────────────────────
async def process_input(file=None, content=None):
    """
    MCP Router:
    - Image → OCR → Cleaner → Search → Articles
    - Text → Cleaner → Search → Articles
    """

    # ❌ prevent invalid input
    if file and content:
        raise ValueError("Provide either file or content, not both")

    # ── INPUT HANDLING ─────────────────────────
    if file is not None:
        image_bytes = await file.read()
        raw_text = extract_text_from_image(image_bytes)
        input_type = "image"

    elif content is not None:
        raw_text = content
        input_type = "text"

    else:
        raise ValueError("No input provided")

    # ── CLEANING ───────────────────────────────
    cleaned = clean_text(raw_text)

    # ── SEARCH + SCRAPE ────────────────────────
    search_results = search_articles(cleaned)

    # ── FINAL RESPONSE ─────────────────────────
    return {
        "input_type": input_type,
        "raw_text": raw_text,
        "cleaned_text": cleaned,
        "word_count": word_count(cleaned),
        "search_results": search_results
    }