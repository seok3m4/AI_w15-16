from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import httpx

from app.guardrails import EvidenceGuardrailError

TOOL_ALLOWLIST = {
    "economic_indicator_search",
    "latest_fred_snapshot",
    "related_news_search",
    "rag_search",
}

GDELT_DOC_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc"


def economic_indicator_search(
    dashboard: dict[str, Any],
    query: str,
    category: str | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    normalized_query = _normalize(query)
    normalized_category = _normalize(category)
    results: list[dict[str, Any]] = []

    for metric in dashboard.get("metrics", []):
        if normalized_category and _normalize(metric.get("category")) != normalized_category:
            continue
        haystack = " ".join(
            str(value or "")
            for value in [
                metric.get("id"),
                metric.get("seriesId"),
                metric.get("name"),
                metric.get("category"),
                metric.get("interpretation"),
                _metric_synonyms(metric),
            ]
        ).lower()
        if not normalized_query or normalized_query in haystack:
            results.append(
                {
                    "id": metric.get("id", ""),
                    "type": "metric",
                    "title": metric.get("name") or metric.get("id", ""),
                    "category": metric.get("category", ""),
                    "sourceName": metric.get("sourceName", ""),
                    "sourceUrl": metric.get("sourceUrl", ""),
                    "snippet": metric.get("interpretation", ""),
                }
            )

    for event in dashboard.get("events", []):
        haystack = " ".join(
            str(value or "")
            for value in [
                event.get("id"),
                event.get("title"),
                event.get("importance"),
                event.get("interpretation"),
            ]
        ).lower()
        if not normalized_query or normalized_query in haystack:
            results.append(
                {
                    "id": event.get("id", ""),
                    "type": "event",
                    "title": event.get("title") or event.get("id", ""),
                    "category": event.get("importance", ""),
                    "sourceName": event.get("sourceName", ""),
                    "sourceUrl": event.get("sourceUrl", ""),
                    "snippet": event.get("interpretation", ""),
                }
            )

    for report in dashboard.get("reports", []):
        haystack = " ".join(
            str(value or "")
            for value in [
                report.get("id"),
                report.get("title"),
                report.get("category"),
                report.get("summary"),
                report.get("koreaImplication"),
            ]
        ).lower()
        if not normalized_query or normalized_query in haystack:
            results.append(
                {
                    "id": report.get("id", ""),
                    "type": "report",
                    "title": report.get("title") or report.get("id", ""),
                    "category": report.get("category", ""),
                    "sourceName": report.get("sourceName", ""),
                    "sourceUrl": report.get("sourceUrl", ""),
                    "snippet": report.get("summary", ""),
                }
            )

    return results[: _safe_limit(limit)]


def latest_fred_snapshot(
    dashboard: dict[str, Any],
    metric_ids: list[str] | None = None,
    series_ids: list[str] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    metric_ids = metric_ids or []
    series_ids = series_ids or []
    results = []
    for metric in dashboard.get("metrics", []):
        if metric_ids and metric.get("id") not in metric_ids:
            continue
        if series_ids and metric.get("seriesId") not in series_ids:
            continue
        if metric.get("sourceName") == "FRED" and metric.get("sourceUrl"):
            results.append(metric)
    return results[: _safe_limit(limit)]


def related_news_search(
    query: str,
    metric_ids: list[str] | None = None,
    lookback_hours: int = 24,
    limit: int = 5,
) -> list[dict[str, Any]]:
    del metric_ids
    params = {
        "query": query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": _safe_limit(limit),
        "timespan": f"{max(1, min(lookback_hours, 168))}h",
        "sort": "datedesc",
    }
    try:
        response = httpx.get(f"{GDELT_DOC_API_URL}?{urlencode(params)}", timeout=8.0)
        response.raise_for_status()
        payload = response.json()
        return normalize_gdelt_articles(payload.get("articles", []))
    except Exception:
        return []


def rag_search(
    query: str,
    source_types: list[str] | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    backend_url = os.getenv("AGENT_BACKEND_INTERNAL_URL", "http://localhost:8080").rstrip("/")
    token = os.getenv("AGENT_WORKER_TOKEN", "local-agent-token")
    params: dict[str, Any] = {"query": query, "limit": _safe_limit(limit)}
    if source_types:
        params["sourceTypes"] = source_types
    try:
        response = httpx.get(
            f"{backend_url}/api/internal/agent-tools/rag-search",
            params=params,
            headers={"X-Agent-Worker-Token": token},
            timeout=8.0,
        )
        response.raise_for_status()
        return response.json().get("results", [])
    except Exception:
        return []


def normalize_gdelt_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for article in articles:
        url = str(article.get("url") or "").strip()
        title = str(article.get("title") or "").strip()
        if not url or not title or url in seen_urls:
            continue
        seen_urls.add(url)
        domain = str(article.get("domain") or "").strip()
        normalized.append(
            {
                "id": "news-gdelt-" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:12],
                "type": "news",
                "title": title,
                "sourceName": domain or "GDELT",
                "sourceUrl": url,
                "publishedAt": _gdelt_date(article.get("seendate")),
                "snippet": str(article.get("socialimage") or article.get("language") or "").strip(),
                "payload": json.dumps(article, ensure_ascii=False),
            }
        )
    return normalized


def validate_tool_evidence(
    evidence_news_ids: list[str] | None,
    evidence_rag_chunk_ids: list[str] | None,
    evidence_items: list[dict[str, Any]],
) -> None:
    news_ids = {
        item.get("id")
        for item in evidence_items or []
        if item.get("type") == "news" and item.get("id") and item.get("sourceUrl")
    }
    rag_ids = {
        item.get("id")
        for item in evidence_items or []
        if item.get("type") == "rag" and item.get("id") and item.get("sourceUrl")
    }

    for news_id in evidence_news_ids or []:
        if news_id not in news_ids:
            raise EvidenceGuardrailError(f"unknown or unsourced news: {news_id}")

    for rag_id in evidence_rag_chunk_ids or []:
        if rag_id not in rag_ids:
            raise EvidenceGuardrailError(f"unknown or unsourced RAG chunk: {rag_id}")


def _metric_synonyms(metric: dict[str, Any]) -> str:
    metric_id = str(metric.get("id") or "").lower()
    series_id = str(metric.get("seriesId") or "").lower()
    if metric_id == "cpi" or series_id == "cpiaucsl":
        return "inflation prices consumer price"
    if metric_id == "unemployment" or series_id == "unrate":
        return "jobs labor unemployment employment"
    if metric_id == "usd-krw":
        return "fx exchange rate dollar won"
    return ""


def _normalize(value: str | None) -> str | None:
    if value is None or not str(value).strip():
        return None
    return str(value).strip().lower()


def _safe_limit(limit: int) -> int:
    return max(1, min(limit or 5, 10))


def _gdelt_date(value: Any) -> str | None:
    if not value:
        return None
    raw = str(value)
    for pattern in ("%Y%m%dT%H%M%SZ", "%Y%m%d%H%M%S"):
        try:
            return datetime.strptime(raw, pattern).replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            continue
    return raw
