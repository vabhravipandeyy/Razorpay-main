import os
import json
import re
from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.core.logging_config import logger


class VectorStoreService:
    """
    Lightweight, self-contained Vector Store for GST Regulatory Knowledge.
    Provides fast, deterministic embedding & cosine similarity retrieval with metadata preservation.
    """

    STORE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "rag_artifacts")
    STORE_PATH = os.path.join(STORE_DIR, "gst_knowledge_store.json")

    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.doc_vectors: Optional[np.ndarray] = None
        self.load()

    def add_documents(self, docs: List[Dict[str, Any]]):
        """Add and index structured document chunks with metadata."""
        logger.info(f"VectorStore: Adding {len(docs)} document chunks")
        self.documents = docs
        if not docs:
            self.vectorizer = None
            self.doc_vectors = None
            return

        texts = [d["text"] for d in docs]
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            max_features=5000,
        )
        self.doc_vectors = self.vectorizer.fit_transform(texts)
        self.save()

    def search(self, query: str, top_k: int = 3, threshold: float = 0.05) -> List[Dict[str, Any]]:
        """Perform semantic cosine similarity search against indexed knowledge base."""
        if not self.documents or self.vectorizer is None or self.doc_vectors is None:
            return []

        query_vec = self.vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, self.doc_vectors).flatten()

        # Rank indices
        top_indices = np.argsort(similarities)[::-1]
        results = []

        for idx in top_indices[:top_k]:
            score = float(similarities[idx])
            if score >= threshold:
                doc = self.documents[idx].copy()
                doc["score"] = round(score, 4)
                results.append(doc)

        return results

    def save(self):
        """Persist vector store metadata and chunks to disk."""
        os.makedirs(self.STORE_DIR, exist_ok=True)
        with open(self.STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(self.documents, f, indent=2)

    def load(self):
        """Load vector store if artifact exists."""
        if os.path.exists(self.STORE_PATH):
            try:
                with open(self.STORE_PATH, "r", encoding="utf-8") as f:
                    docs = json.load(f)
                if docs:
                    self.add_documents(docs)
            except Exception as e:
                logger.error(f"Failed to load vector store from disk: {e}")
