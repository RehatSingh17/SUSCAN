"""
processors/ner.py
Named Entity Recognition for SUSCAN.

Used in two places:
1. Query time  — extract entities from user's claim to filter retrieved chunks
2. Ingestion   — extract entities from articles before storing in ChromaDB

Supports English + major Indian languages via two spaCy models:
- en_core_web_sm       (English, fast, 12MB)
- xx_ent_wiki_sm       (Multilingual, covers Hindi/Telugu/Bengali/etc, 14MB)

Install:
    pip install spacy --break-system-packages
    python -m spacy download en_core_web_sm
    python -m spacy download xx_ent_wiki_sm
"""

import logging
import re
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)

# ── Minimum confidence to trust an extracted entity ───────────────────────────
# spaCy doesn't expose per-entity confidence scores like ML models do,
# so we use a text-quality heuristic instead (see _is_valid_entity below).
MIN_ENTITY_LENGTH = 2   # single chars are almost always noise
MAX_ENTITY_LENGTH = 60  # anything longer is probably a sentence fragment


# ── Lazy-load models — only pay the cost once ─────────────────────────────────
@lru_cache(maxsize=1)
def _get_en_model():
    try:
        import spacy
        return spacy.load("en_core_web_sm")
    except OSError:
        logger.warning("[NER] en_core_web_sm not found. Run: python -m spacy download en_core_web_sm")
        return None


@lru_cache(maxsize=1)
def _get_multilingual_model():
    try:
        import spacy
        return spacy.load("xx_ent_wiki_sm")
    except OSError:
        logger.warning("[NER] xx_ent_wiki_sm not found. Run: python -m spacy download xx_ent_wiki_sm")
        return None


# ── Entity validator — filters out garbage extractions ────────────────────────
def _is_valid_entity(text: str) -> bool:
    """
    Basic quality filter for extracted entities.
    Removes single chars, pure numbers, punctuation-only strings,
    and overly long fragments that are probably sentence noise.
    """
    text = text.strip()
    if len(text) < MIN_ENTITY_LENGTH or len(text) > MAX_ENTITY_LENGTH:
        return False
    if re.fullmatch(r"[\d\s\.\,\-\/]+", text):
        return False  # pure numbers/dates/punctuation
    return True


def _clean(text: str) -> str:
    return text.strip().title()  # normalize casing: "mumbai" → "Mumbai"


# ── Core extraction function ───────────────────────────────────────────────────
def extract_entities(text: str, language: str = "en") -> dict:
    """
    Extract named entities from text.

    Args:
        text:     The input string (user query or article chunk).
        language: ISO language code — "en" uses English model,
                  anything else uses multilingual model.

    Returns:
        {
            "people":    ["Narendra Modi", "Elon Musk"],
            "locations": ["Mumbai", "Delhi"],
            "orgs":      ["ISRO", "Reuters"],
            "raw_count": 5   ← total entities found before filtering
        }

    If both models fail to load, returns empty dict (safe fallback —
    caller should treat this as "vague query" path, not an error).
    """
    result = {"people": [], "locations": [], "orgs": [], "raw_count": 0}

    if not text or not text.strip():
        return result

    # Pick model based on language
    if language == "en":
        nlp = _get_en_model()
        # Fallback to multilingual if English model missing
        if nlp is None:
            nlp = _get_multilingual_model()
    else:
        nlp = _get_multilingual_model()
        # Fallback to English if multilingual model missing
        if nlp is None:
            nlp = _get_en_model()

    if nlp is None:
        logger.error("[NER] No spaCy model available — returning empty entities")
        return result

    try:
        # spaCy has a max text length limit — truncate safely
        doc = nlp(text[:100_000])
        result["raw_count"] = len(doc.ents)

        seen = set()  # deduplicate within same extraction
        for ent in doc.ents:
            text_clean = _clean(ent.text)
            if not _is_valid_entity(text_clean):
                continue
            if text_clean in seen:
                continue
            seen.add(text_clean)

            label = ent.label_

            # spaCy label mapping:
            # PERSON / PER → people
            # GPE (geo-political), LOC, FAC → locations
            # ORG → organizations
            if label in ("PERSON", "PER"):
                result["people"].append(text_clean)
            elif label in ("GPE", "LOC", "FAC"):
                result["locations"].append(text_clean)
            elif label == "ORG":
                result["orgs"].append(text_clean)
            # DATE, EVENT, etc. intentionally ignored for now

    except Exception as e:
        logger.error(f"[NER] Extraction failed: {type(e).__name__}: {e}")

    logger.debug(f"[NER] lang={language} → {result}")
    return result


# ── Entity overlap check — used at query time and ingestion clustering ─────────
def entities_overlap(
    query_entities: dict,
    chunk_entities: dict,
    require_location_match: bool = True,
) -> bool:
    """
    Check whether a retrieved chunk shares entities with the user query.

    Rules:
    - If query has NO extractable entities → return True (treat as vague,
      don't filter — caller handles the multi-cluster path).
    - If query has entities but chunk has NONE → return False (chunk has
      no metadata to match against, exclude it).
    - Otherwise → check for overlap in locations (primary) and
      optionally people/orgs.

    Args:
        query_entities:        Output of extract_entities() on the user query.
        chunk_entities:        Output of extract_entities() on a stored chunk.
        require_location_match: If True (default), a location match is required
                               when the query contains locations. Set False
                               for org/person-only queries.

    Returns:
        True  → chunk passes entity filter, keep it
        False → chunk fails entity filter, exclude it
    """
    q_people    = set(query_entities.get("people",    []))
    q_locations = set(query_entities.get("locations", []))
    q_orgs      = set(query_entities.get("orgs",      []))

    c_people    = set(chunk_entities.get("people",    []))
    c_locations = set(chunk_entities.get("locations", []))
    c_orgs      = set(chunk_entities.get("orgs",      []))

    # Vague query — no entities extracted → don't filter
    if not q_people and not q_locations and not q_orgs:
        logger.debug("[NER] Vague query — entity filter skipped")
        return True

    # Chunk has no metadata → can't confirm overlap → exclude
    if not c_people and not c_locations and not c_orgs:
        logger.debug("[NER] Chunk has no entities — excluded")
        return False

    # Location check (primary — most important for news events)
    if q_locations and require_location_match:
        if q_locations & c_locations:  # set intersection
            return True
        # No location overlap — check if people/orgs save it
        # (e.g. query "Modi in Japan" — location might differ in chunk wording)
        if (q_people & c_people) or (q_orgs & c_orgs):
            return True
        return False

    # No location in query — check people and orgs
    if (q_people & c_people) or (q_orgs & c_orgs):
        return True

    return False


# ── Cluster merging check — used at ingestion time ────────────────────────────
def should_merge_into_cluster(
    new_chunk_entities: dict,
    cluster_entities: dict,
    vector_similarity: float,
    days_apart: float,
    similarity_threshold: float = 0.75,
    max_days: float = 3.0,
) -> bool:
    """
    Decide whether a new article chunk should be merged into an existing
    event cluster. Requires ALL THREE signals to agree:

    1. Vector similarity  ≥ threshold (topic relevance)
    2. Entity overlap     (location minimum) — same event identity
    3. Date proximity     ≤ max_days — same time window

    If any one fails → do not merge, create a new cluster.

    Args:
        new_chunk_entities:  Entities extracted from the incoming article.
        cluster_entities:    Aggregated entities of the existing cluster.
        vector_similarity:   Cosine similarity score (0.0 to 1.0).
        days_apart:          Absolute day difference between article dates.
        similarity_threshold: Minimum vector similarity to consider (default 0.75).
        max_days:            Maximum days apart to merge (default 3.0).

    Returns:
        True  → merge into existing cluster
        False → create new cluster
    """
    # Gate 1: vector similarity
    if vector_similarity < similarity_threshold:
        logger.debug(f"[NER] Cluster merge rejected: similarity {vector_similarity:.2f} < {similarity_threshold}")
        return False

    # Gate 2: date proximity
    if days_apart > max_days:
        logger.debug(f"[NER] Cluster merge rejected: {days_apart:.1f} days apart > {max_days}")
        return False

    # Gate 3: entity overlap (location required)
    overlap = entities_overlap(
        new_chunk_entities,
        cluster_entities,
        require_location_match=True,
    )
    if not overlap:
        logger.debug("[NER] Cluster merge rejected: no entity overlap")
        return False

    logger.debug(f"[NER] Cluster merge approved: sim={vector_similarity:.2f}, days={days_apart:.1f}")
    return True


# ── Quick test ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)

    test_cases = [
        ("Attack in Mumbai killed 3 people", "en"),
        ("Delhi blast near parliament building", "en"),
        ("Narendra Modi visited Japan for G7 summit", "en"),
        ("ISRO launched satellite from Sriharikota", "en"),
        ("मुंबई में हमला हुआ", "hi"),          # Hindi: "Attack happened in Mumbai"
        ("Aliens landed in Delhi yesterday", "en"),
    ]

    print("\n── Entity Extraction Tests ──")
    for text, lang in test_cases:
        result = extract_entities(text, lang)
        print(f"\nText: {text}")
        print(f"  locations : {result['locations']}")
        print(f"  people    : {result['people']}")
        print(f"  orgs      : {result['orgs']}")

    print("\n── Overlap Tests ──")
    mumbai_query = extract_entities("Attack in Mumbai", "en")
    delhi_chunk  = {"people": [], "locations": ["Delhi"], "orgs": [], "raw_count": 1}
    mumbai_chunk = {"people": [], "locations": ["Mumbai"], "orgs": [], "raw_count": 1}

    print(f"Mumbai query vs Delhi chunk  → overlap: {entities_overlap(mumbai_query, delhi_chunk)}")   # False
    print(f"Mumbai query vs Mumbai chunk → overlap: {entities_overlap(mumbai_query, mumbai_chunk)}")  # True