from __future__ import annotations

import os
from typing import Any

import httpx

from app.mcp_tools import (
    TOOL_ALLOWLIST,
    rag_search as run_rag_search,
    related_news_search as run_related_news_search,
)


def build_mcp_server() -> Any | None:
    try:
        from mcp.server.fastmcp import FastMCP
    except ModuleNotFoundError:
        return None

    mcp = FastMCP("US Economy MCP", streamable_http_path="/")

    @mcp.tool()
    def economic_indicator_search(query: str, category: str | None = None, limit: int = 5) -> list[dict[str, Any]]:
        """Search verified U.S. economy indicator metadata from the Spring cache."""
        return _backend_get(
            "/api/internal/agent-tools/indicators",
            {"query": query, "category": category, "limit": limit},
        ).get("results", [])

    @mcp.tool()
    def latest_fred_snapshot(
        metricIds: list[str] | None = None,
        seriesIds: list[str] | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Return latest verified FRED snapshots from the Spring cache."""
        return _backend_get(
            "/api/internal/agent-tools/fred-snapshot",
            {"metricIds": metricIds or [], "seriesIds": seriesIds or [], "limit": limit},
        ).get("results", [])

    @mcp.tool()
    def related_news_search(
        query: str,
        metricIds: list[str] | None = None,
        lookbackHours: int = 24,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Search GDELT related news and return sourced news evidence items."""
        return run_related_news_search(query, metricIds, lookbackHours, limit)

    @mcp.tool()
    def rag_search(
        query: str,
        sourceTypes: list[str] | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Search the Spring hybrid RAG index and return sourced RAG evidence items."""
        return run_rag_search(query, sourceTypes, limit)

    return mcp


def build_mcp_app(mcp: Any | None = None) -> Any | None:
    server = mcp if mcp is not None else build_mcp_server()
    if server is None:
        return None
    return server.streamable_http_app()


def _backend_get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    backend_url = os.getenv("AGENT_BACKEND_INTERNAL_URL", "http://localhost:8080").rstrip("/")
    token = os.getenv("AGENT_WORKER_TOKEN", "local-agent-token")
    clean_params = {key: value for key, value in params.items() if value not in (None, [], "")}
    try:
        response = httpx.get(
            backend_url + path,
            params=clean_params,
            headers={"X-Agent-Worker-Token": token},
            timeout=8.0,
        )
        response.raise_for_status()
        return response.json()
    except Exception:
        return {"results": []}


def available_tool_names() -> set[str]:
    return set(TOOL_ALLOWLIST)
