#!/usr/bin/env python3
"""
GST Regulatory Knowledge Base Ingestion Script.
Extracts, structures, and indexes authoritative CBIC GST & E-Way Bill regulations into the vector store.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai.rag_service import RAGService
from app.services.ai.vector_store import VectorStoreService
from app.core.logging_config import logger


def run_ingestion():
    logger.info("Starting GST Regulatory Knowledge Base ingestion pipeline...")
    store = VectorStoreService()
    docs = RAGService.OFFICIAL_GST_DOCUMENTS
    store.add_documents(docs)

    print("\n" + "=" * 60)
    print("✅ GST RAG KNOWLEDGE INGESTION COMPLETE")
    print("=" * 60)
    print(f"Total Document Chunks: {len(docs)}")
    print(f"Vector Store Path:     {store.STORE_PATH}")
    print("Indexed Regulations:")
    for d in docs:
        print(f" - [{d['doc_id']}] {d['title']} ({d['section']})")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_ingestion()
