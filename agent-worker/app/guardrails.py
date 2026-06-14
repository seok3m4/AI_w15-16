from __future__ import annotations

from typing import Any


class EvidenceGuardrailError(ValueError):
    pass


def validate_evidence(
    dashboard: dict[str, Any],
    evidence_metric_ids: list[str] | None,
    evidence_event_ids: list[str] | None,
) -> None:
    metric_ids = {
        metric.get("id")
        for metric in dashboard.get("metrics", [])
        if metric.get("id") and metric.get("sourceUrl")
    }
    event_ids = {
        event.get("id")
        for event in dashboard.get("events", [])
        if event.get("id") and event.get("sourceUrl")
    }

    for metric_id in evidence_metric_ids or []:
        if metric_id not in metric_ids:
            raise EvidenceGuardrailError(f"unknown or unsourced metric: {metric_id}")

    for event_id in evidence_event_ids or []:
        if event_id not in event_ids:
            raise EvidenceGuardrailError(f"unknown or unsourced event: {event_id}")


def filter_sourced_metric_ids(dashboard: dict[str, Any], ids: list[str] | None) -> list[str]:
    allowed = {
        metric.get("id")
        for metric in dashboard.get("metrics", [])
        if metric.get("id") and metric.get("sourceUrl")
    }
    return [metric_id for metric_id in ids or [] if metric_id in allowed]


def filter_sourced_event_ids(dashboard: dict[str, Any], ids: list[str] | None) -> list[str]:
    allowed = {
        event.get("id")
        for event in dashboard.get("events", [])
        if event.get("id") and event.get("sourceUrl")
    }
    return [event_id for event_id in ids or [] if event_id in allowed]
