from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable

try:
    from langchain_core.documents import Document
except ModuleNotFoundError:
    @dataclass
    class Document:  # type: ignore[no-redef]
        page_content: str
        metadata: dict[str, Any]


BackendSearch = Callable[[str, list[str] | None, int], list[dict[str, Any]]]


class DiscussionRetriever:
    """LangChain-compatible retriever wrapper for Spring-owned discussion RAG search."""

    def __init__(
        self,
        backend_search: BackendSearch,
        source_types: list[str] | None = None,
        limit: int = 5,
    ) -> None:
        self.backend_search = backend_search
        self.source_types = source_types
        self.limit = max(1, min(limit or 5, 10))

    def invoke(self, query: str) -> list[Document]:
        return backend_rag_results_to_documents(
            self.backend_search(query, self.source_types, self.limit)
        )

    def search_evidence_items(self, query: str) -> list[dict[str, Any]]:
        return documents_to_evidence_items(self.invoke(query))


def backend_rag_results_to_documents(results: list[dict[str, Any]]) -> list[Document]:
    documents: list[Document] = []
    for result in results:
        source_url = str(result.get("sourceUrl") or "").strip()
        title = str(result.get("title") or "").strip()
        snippet = str(result.get("snippet") or "").strip()
        chunk_id = str(result.get("id") or "").strip()
        if not source_url or not title or not chunk_id:
            continue
        documents.append(
            Document(
                page_content=snippet or title,
                metadata={
                    "id": chunk_id,
                    "sourceType": str(result.get("sourceType") or ""),
                    "sourceId": str(result.get("sourceId") or ""),
                    "title": title,
                    "sourceName": str(result.get("sourceName") or "BOARD_POST"),
                    "sourceUrl": source_url,
                    "observedAt": result.get("observedAt"),
                    "score": float(result.get("score") or 0),
                },
            )
        )
    return documents


def documents_to_evidence_items(documents: list[Document]) -> list[dict[str, Any]]:
    evidence_items: list[dict[str, Any]] = []
    for document in documents:
        metadata = document.metadata
        source_url = str(metadata.get("sourceUrl") or "").strip()
        chunk_id = str(metadata.get("id") or "").strip()
        if not source_url or not chunk_id:
            continue
        payload = {
            "sourceType": metadata.get("sourceType") or "BOARD_POST",
            "sourceId": metadata.get("sourceId") or "",
            "score": metadata.get("score") or 0,
        }
        evidence_items.append(
            {
                "id": chunk_id,
                "type": "rag",
                "title": str(metadata.get("title") or "Related discussion"),
                "sourceName": str(metadata.get("sourceName") or "BOARD_POST"),
                "sourceUrl": source_url,
                "observedAt": metadata.get("observedAt"),
                "snippet": document.page_content,
                "payload": json.dumps(payload, ensure_ascii=False),
            }
        )
    return evidence_items
