import os
import json
import hashlib
import logging
import struct
from typing import Optional

import redis
from redis.exceptions import ResponseError
from redis.commands.search.field import TagField, VectorField
from redis.commands.search.index_definition import IndexDefinition, IndexType
from redis.commands.search.query import Query
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

CACHE_TTL = 4 * 60 * 60  # 4 hours
SIMILARITY_THRESHOLD = 0.95
EMBEDDING_DIM = 384

CACHE_PREFIX = "suscan:claim:v3:"
INDEX_NAME = "suscan_claims_hnsw"

# Analyse and RAG should use the same mounted Hugging Face model snapshot.
EMBEDDING_MODEL = os.getenv(
    "SUSCAN_EMBEDDING_MODEL",
    "/root/.cache/huggingface/hub/models--sentence-transformers--"
    "paraphrase-multilingual-MiniLM-L12-v2/snapshots/"
    "e8f8c211226b894fcb81acc59f3b34ba3efd5f42",
)

_redis_client = None
_embedder = None
_index_ready = False


def get_redis():
    """Return a binary-safe Redis client (vectors are raw FLOAT32 bytes)."""
    global _redis_client

    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        _redis_client = redis.Redis.from_url(
            redis_url,
            decode_responses=False,
            socket_connect_timeout=2,
            socket_timeout=5,
            health_check_interval=30,
        )
    return _redis_client


def get_embedder():
    global _embedder

    if _embedder is None:
        logger.info("[Redis] Loading embedding model from: %s", EMBEDDING_MODEL)
        _embedder = SentenceTransformer(
            EMBEDDING_MODEL,
            local_files_only=True,
        )

        dimension = _embedder.get_sentence_embedding_dimension()
        if dimension != EMBEDDING_DIM:
            raise ValueError(
                f"Embedding dimension mismatch: expected {EMBEDDING_DIM}, "
                f"loaded {dimension}"
            )

        logger.info("[Redis] Embedding model loaded; dimension=%s", dimension)

    return _embedder


def normalize_claim(claim: str) -> str:
    return " ".join(claim.lower().split())


def _scope_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _normalize_regions(focus_regions: Optional[list]) -> list:
    """Canonicalize region selection so order does not affect the cache scope."""
    return sorted({
        str(region).strip().casefold()
        for region in (focus_regions or [])
        if str(region).strip()
    })


def _scope_values(language: str, focus_regions: Optional[list]):
    language_normalized = str(language or "").strip().casefold()
    regions = _normalize_regions(focus_regions)

    language_key = _scope_hash(language_normalized)
    region_scope = _scope_hash(json.dumps(regions, ensure_ascii=False))

    return language_normalized, language_key, region_scope


def make_claim_key(
    claim: str,
    language: str,
    focus_regions: Optional[list] = None,
) -> str:
    normalized = normalize_claim(claim)
    _, language_key, region_scope = _scope_values(language, focus_regions)

    raw = f"{language_key}::{region_scope}::{normalized}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"{CACHE_PREFIX}{digest}"


def generate_embedding(claim: str) -> list:
    model = get_embedder()
    vector = model.encode(
        claim,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    if len(vector) != EMBEDDING_DIM:
        raise ValueError(
            f"Expected {EMBEDDING_DIM} embedding dimensions, got {len(vector)}"
        )

    return vector.tolist()


def _to_float32_bytes(vector: list) -> bytes:
    return struct.pack(f"{len(vector)}f", *vector)


def _decode(value):
    if isinstance(value, bytes):
        return value.decode("utf-8")
    return value


def ensure_vector_index():
    """Create the HNSW index once; tolerate another worker creating it first."""
    global _index_ready

    if _index_ready:
        return

    client = get_redis()
    search = client.ft(INDEX_NAME)

    try:
        search.info()
        _index_ready = True
        logger.info("[Redis] HNSW index already exists: %s", INDEX_NAME)
        return
    except ResponseError:
        pass

    schema = (
        TagField("language_key"),
        TagField("region_scope"),
        VectorField(
            "embedding",
            "HNSW",
            {
                "TYPE": "FLOAT32",
                "DIM": EMBEDDING_DIM,
                "DISTANCE_METRIC": "COSINE",
                "M": 16,
                "EF_CONSTRUCTION": 200,
            },
        ),
    )

    try:
        search.create_index(
            schema,
            definition=IndexDefinition(
                prefix=[CACHE_PREFIX],
                index_type=IndexType.HASH,
            ),
        )
        logger.info("[Redis] Created HNSW vector index: %s", INDEX_NAME)
    except ResponseError as exc:
        # A second Analyse worker may have created the index concurrently.
        if "already exists" not in str(exc).lower():
            raise
        logger.info("[Redis] HNSW index was created by another worker")

    _index_ready = True


def get_cached_claim(
    claim: str,
    language: str,
    focus_regions: Optional[list] = None,
):
    try:
        client = get_redis()
        ensure_vector_index()

        language_normalized, language_key, region_scope = _scope_values(
            language, focus_regions
        )

        # 1. Exact match, scoped by language AND selected regions.
        key = make_claim_key(claim, language_normalized, focus_regions)
        exact_data = client.hget(key, "data")

        if exact_data:
            logger.info("[Redis] Exact cache HIT")
            return json.loads(_decode(exact_data))

        logger.info("[Redis] Exact cache MISS — running HNSW search")

        # 2. Semantic KNN search, restricted to the same language and regions.
        query_vector = _to_float32_bytes(
            generate_embedding(normalize_claim(claim))
        )

        query_text = (
            f"(@language_key:{{{language_key}}} "
            f"@region_scope:{{{region_scope}}})"
            f"=>[KNN 1 @embedding $vec AS vector_distance]"
        )

        query = (
            Query(query_text)
            .return_fields("data", "vector_distance")
            .dialect(2)
        )

        results = client.ft(INDEX_NAME).search(
            query,
            query_params={"vec": query_vector},
        )

        if not results.docs:
            logger.info("[Redis] Semantic cache MISS — no matching vectors")
            return None

        best = results.docs[0]
        distance = float(_decode(best.vector_distance))
        similarity = 1.0 - distance

        if similarity < SIMILARITY_THRESHOLD:
            logger.info(
                "[Redis] Semantic cache MISS — best similarity %.2f%% "
                "(threshold %.2f%%)",
                similarity * 100,
                SIMILARITY_THRESHOLD * 100,
            )
            return None

        cached_data = _decode(best.data)
        if not cached_data:
            logger.warning("[Redis] Matched vector has no cached response")
            return None

        logger.info(
            "[Redis] Semantic cache HIT — cosine similarity: %.2f%%",
            similarity * 100,
        )
        return json.loads(cached_data)

    except Exception as exc:
        # Cache is an optimization: Redis/model failures must not break analysis.
        logger.warning("[Redis] Cache read failed; continuing normally: %s", exc)
        return None


def set_cached_claim(
    claim: str,
    language: str,
    data: dict,
    focus_regions: Optional[list] = None,
):
    try:
        verdict = str(
            data.get("analysis", {}).get("final_verdict", "")
        ).strip().lower()

        if not verdict or verdict == "unclear":
            logger.info("[Redis] Skipping unclear analysis")
            return False

        client = get_redis()
        ensure_vector_index()

        language_normalized, language_key, region_scope = _scope_values(
            language, focus_regions
        )

        embedding = generate_embedding(normalize_claim(claim))
        key = make_claim_key(claim, language_normalized, focus_regions)

        # Store vector as raw FLOAT32 bytes so Redis Search can index it.
        client.hset(
            key,
            mapping={
                "claim": claim,
                "language": language_normalized,
                "language_key": language_key,
                "region_scope": region_scope,
                "embedding": _to_float32_bytes(embedding),
                "data": json.dumps(data, ensure_ascii=False),
            },
        )
        client.expire(key, CACHE_TTL)

        logger.info(
            "[Redis] Claim cached in HNSW index — TTL: 4 hours; "
            "language=%s; regions=%s",
            language_normalized,
            _normalize_regions(focus_regions),
        )
        return True

    except Exception as exc:
        logger.warning("[Redis] Cache write failed: %s", exc)
        return False
