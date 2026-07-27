"""
services/vector_store.py
ChromaDB vector store for SUSCAN RAG pipeline.
"""

import os
import logging
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

CHROMA_DIR           = os.getenv("CHROMA_DIR", "./chroma_db")
COLLECTION_NAME      = "suscan_articles"
EMBEDDING_MODEL      = "paraphrase-multilingual-MiniLM-L12-v2"
RETENTION_DAYS       = int(os.getenv("CHROMA_RETENTION_DAYS", "60"))
DEFAULT_TOP_K        = 5
SIMILARITY_THRESHOLD = 0.70

_client     = None
_collection = None
_embedder   = None


def _get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"[VectorStore] Loading embedding model: {EMBEDDING_MODEL}")
            _embedder = SentenceTransformer(EMBEDDING_MODEL)
            logger.info("[VectorStore] Embedding model ready")
        except Exception as e:
            logger.error(f"[VectorStore] Failed to load embedding model: {e}")
            raise
    return _embedder


def _get_collection():
    global _client, _collection
    if _collection is None:
        try:
            import chromadb
            from chromadb.config import Settings
            logger.info(f"[VectorStore] Connecting to ChromaDB at: {CHROMA_DIR}")
            _client = chromadb.PersistentClient(
                path=CHROMA_DIR,
                settings=Settings(anonymized_telemetry=False),
            )
            _collection = _client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"[VectorStore] Collection '{COLLECTION_NAME}' ready — {_collection.count()} chunks stored")
        except Exception as e:
            logger.error(f"[VectorStore] ChromaDB connection failed: {e}")
            raise
    return _collection


def _make_chunk_id(url: str, chunk_index: int = 0) -> str:
    raw = f"{url}::{chunk_index}"
    return hashlib.md5(raw.encode()).hexdigest()


def _date_to_ts(date_str: str) -> int:
    """Convert YYYY-MM-DD string to Unix timestamp integer for ChromaDB filtering."""
    try:
        return int(datetime.strptime(date_str, "%Y-%m-%d")
                   .replace(tzinfo=timezone.utc).timestamp())
    except Exception:
        return int(datetime.now(timezone.utc).timestamp())


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list:
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    chunks = []
    start  = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        start += chunk_size - overlap
    return chunks


class VectorStore:

    def __init__(self):
        self.collection = _get_collection()
        self.embedder   = _get_embedder()

    # ── ADD CHUNKS ────────────────────────────────────────────────────────────
    def add_chunks(self, chunks: list) -> int:
        if not chunks:
            return 0

        ids       = []
        texts     = []
        metadatas = []
        skip_count = 0

        for chunk in chunks:
            url         = chunk.get("url", "")
            chunk_index = chunk.get("chunk_index", 0)
            chunk_text_ = chunk.get("chunk_text", "").strip()

            if not chunk_text_ or not url:
                skip_count += 1
                continue

            chunk_id  = _make_chunk_id(url, chunk_index)
            entities  = chunk.get("entities", {"people": [], "locations": [], "orgs": []})
            published = chunk.get("published", datetime.now(timezone.utc).strftime("%Y-%m-%d"))

            metadata = {
                "url":          url,
                "source":       chunk.get("source", "Unknown"),
                "published":    published,
                "published_ts": _date_to_ts(published),   # ← numeric for $lt filter
                "language":     chunk.get("language", "en"),
                "event_id":     chunk.get("event_id", ""),
                "entities":     json.dumps(entities),
                "full_text":    chunk.get("full_text", "")[:2000],
                "chunk_index":  chunk_index,
            }

            ids.append(chunk_id)
            texts.append(chunk_text_)
            metadatas.append(metadata)

        if not texts:
            logger.warning(f"[VectorStore] No valid chunks to add ({skip_count} skipped)")
            return 0

        try:
            embeddings = self.embedder.encode(texts, show_progress_bar=False).tolist()
            self.collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
            )
            logger.info(f"[VectorStore] Added {len(texts)} chunks ({skip_count} skipped)")
            return len(texts)
        except Exception as e:
            logger.error(f"[VectorStore] Failed to add chunks: {e}")
            return 0

    # ── SEARCH ────────────────────────────────────────────────────────────────
    def search(
        self,
        query_text: str,
        query_language: str = "en",
        top_k: int = DEFAULT_TOP_K,
        apply_entity_filter: bool = True,
    ) -> list:
        if not query_text or not query_text.strip():
            return []

        try:
            query_embedding = self.embedder.encode(
                [query_text], show_progress_bar=False
            ).tolist()[0]

            fetch_k = top_k * 4
            total   = self.collection.count()
            if total == 0:
                return []

            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(fetch_k, total),
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.error(f"[VectorStore] Search failed: {e}")
            return []

        docs      = results.get("documents", [[]])[0]
        metas     = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        if not docs:
            logger.info("[VectorStore] No results from Chroma")
            return []

        if apply_entity_filter:
            from processors.ner import extract_entities, entities_overlap
            query_entities = extract_entities(query_text, language=query_language)
        else:
            query_entities = None

        candidates = []
        for doc, meta, dist in zip(docs, metas, distances):
            similarity = round(1 - dist, 4)

            if dist > (1 - SIMILARITY_THRESHOLD):
                continue

            try:
                chunk_entities = json.loads(meta.get("entities", "{}"))
            except (json.JSONDecodeError, TypeError):
                chunk_entities = {"people": [], "locations": [], "orgs": []}

            if apply_entity_filter and query_entities is not None:
                if not entities_overlap(query_entities, chunk_entities):
                    logger.debug(f"[VectorStore] Entity filter excluded: {meta.get('url', '')[:60]}")
                    continue

            candidates.append({
                "chunk_text": doc,
                "url":        meta.get("url", ""),
                "source":     meta.get("source", ""),
                "published":  meta.get("published", ""),
                "language":   meta.get("language", "en"),
                "event_id":   meta.get("event_id", ""),
                "entities":   chunk_entities,
                "full_text":  meta.get("full_text", ""),
                "distance":   round(dist, 4),
                "similarity": similarity,
            })

            if len(candidates) >= top_k:
                break

        logger.info(f"[VectorStore] {len(candidates)} candidates after entity filter")
        return candidates

    # ── CACHE-ASIDE WRITE-BACK ────────────────────────────────────────────────
    def write_back(self, search_results: list, source_name: str = "live_search") -> int:
        from processors.ner import extract_entities
        import uuid

        chunks_to_add = []
        for result in search_results:
            full_text = result.get("full_text", "") or result.get("excerpt", "")
            url       = result.get("url", "")
            if not full_text or not url:
                continue

            event_id = f"live_{uuid.uuid4().hex[:8]}"
            lang     = result.get("language", "en")
            entities = extract_entities(full_text[:2000], language=lang)
            text_chunks = chunk_text(full_text)

            for i, chunk in enumerate(text_chunks):
                chunks_to_add.append({
                    "chunk_text":  chunk,
                    "url":         url,
                    "source":      result.get("source", source_name),
                    "published":   datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "language":    lang,
                    "entities":    entities,
                    "event_id":    event_id,
                    "full_text":   full_text,
                    "chunk_index": i,
                })

        added = self.add_chunks(chunks_to_add)
        logger.info(f"[VectorStore] Write-back: {added} chunks from {len(search_results)} live results")
        return added

    # ── RETENTION CLEANUP — fixed to use numeric timestamp ────────────────────
    def delete_old_chunks(self, retention_days: int = RETENTION_DAYS) -> int:
        cutoff_ts = int(
            (datetime.now(timezone.utc) - timedelta(days=retention_days)).timestamp()
        )
        try:
            self.collection.delete(
                where={"published_ts": {"$lt": cutoff_ts}}
            )
            logger.info(f"[VectorStore] Deleted chunks older than {retention_days} days")
            return 1
        except Exception as e:
            logger.error(f"[VectorStore] Retention cleanup failed: {e}")
            return 0

    # ── STATS ─────────────────────────────────────────────────────────────────
    def count(self) -> int:
        try:
            return self.collection.count()
        except Exception:
            return 0

    def is_empty(self) -> bool:
        return self.count() == 0