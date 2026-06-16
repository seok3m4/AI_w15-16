import json
from typing import Protocol

import httpx

from app.settings import Settings
from app.summary.models import (
    SummaryRequest,
    SummaryResponse,
    SummarySource,
    SummarySourceSummary,
    SummaryUsage,
)


class SummaryProviderError(Exception):
    def __init__(self, status_code: int, code: str, safe_message: str) -> None:
        super().__init__(safe_message)
        self.status_code = status_code
        self.code = code
        self.safe_message = safe_message


class SummaryProvider(Protocol):
    def summarize(self, request: SummaryRequest) -> SummaryResponse:
        ...


class MockSummaryProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def summarize(self, request: SummaryRequest) -> SummaryResponse:
        sources = _select_sources(request, self.settings)
        source_summaries = [
            _source_summary(source, _short_summary(source.snippet))
            for source in sources
        ]
        evidence = " ".join(source.summary for source in source_summaries)
        answer = (
            f"{len(source_summaries)}개의 근거를 바탕으로 "
            f"'{request.query}'에 대해 요약했습니다. {evidence}"
        )
        return SummaryResponse(
            provider="mock",
            model=self.settings.ai_summary_model,
            query=request.query,
            answer=answer,
            usedFriendContext=request.scope != "me",
            sources=source_summaries,
            usage=SummaryUsage(inputTokens=0, outputTokens=0, totalTokens=0),
        )


class OpenAISummaryProvider:
    endpoint = "https://api.openai.com/v1/responses"

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(timeout=settings.ai_timeout_seconds)

    def summarize(self, request: SummaryRequest) -> SummaryResponse:
        if not self.settings.openai_api_key:
            raise SummaryProviderError(
                502,
                "OPENAI_API_KEY_MISSING",
                "OpenAI summary provider is not configured.",
            )

        sources = _select_sources(request, self.settings)
        try:
            response = self.client.post(
                self.endpoint,
                headers={
                    "Authorization": f"Bearer {self.settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.settings.ai_summary_model,
                    "input": _build_prompt(request, sources, self.settings),
                },
            )
        except httpx.TimeoutException as exc:
            raise SummaryProviderError(
                502,
                "SUMMARY_PROVIDER_TIMEOUT",
                "Summary provider timed out.",
            ) from exc
        except httpx.HTTPError as exc:
            raise SummaryProviderError(
                502,
                "SUMMARY_PROVIDER_UNAVAILABLE",
                "Summary provider request failed.",
            ) from exc

        if response.status_code >= 400:
            raise SummaryProviderError(
                502,
                "SUMMARY_PROVIDER_ERROR",
                "Summary provider returned an error.",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise SummaryProviderError(
                502,
                "SUMMARY_PROVIDER_INVALID_RESPONSE",
                "Summary provider returned invalid JSON.",
            ) from exc

        result = _parse_summary_payload(payload)
        answer = result.get("answer")
        if not isinstance(answer, str) or not answer.strip():
            raise SummaryProviderError(
                502,
                "SUMMARY_PROVIDER_INVALID_RESPONSE",
                "Summary provider returned a malformed answer.",
            )

        return SummaryResponse(
            provider="openai",
            model=self.settings.ai_summary_model,
            query=request.query,
            answer=answer.strip(),
            usedFriendContext=request.scope != "me",
            sources=_map_provider_sources(sources, result.get("sources")),
            usage=_usage_from_payload(payload),
        )


def build_summary_provider(settings: Settings) -> SummaryProvider:
    provider = settings.ai_provider.lower()
    if provider == "mock":
        return MockSummaryProvider(settings)
    if provider == "openai":
        return OpenAISummaryProvider(settings)
    raise SummaryProviderError(
        400,
        "UNSUPPORTED_AI_PROVIDER",
        f"Unsupported AI provider: {settings.ai_provider}",
    )


def _select_sources(request: SummaryRequest, settings: Settings) -> list[SummarySource]:
    limit = min(request.maxSources, settings.ai_summary_max_sources)
    return request.sources[:limit]


def _source_summary(source: SummarySource, summary: str) -> SummarySourceSummary:
    return SummarySourceSummary(
        ownerUserId=source.ownerUserId,
        ownerNickname=source.ownerNickname,
        postId=source.postId,
        title=source.title,
        sourceType=source.sourceType,
        summary=summary,
    )


def _short_summary(text: str) -> str:
    normalized = " ".join(text.split())
    for delimiter in (".", "!", "?", "。"):
        if delimiter in normalized:
            first_sentence = normalized.split(delimiter, 1)[0].strip()
            if first_sentence:
                return f"{first_sentence}{delimiter}"
    return normalized[:240]


def _build_prompt(
    request: SummaryRequest,
    sources: list[SummarySource],
    settings: Settings,
) -> str:
    source_payload = [
        {
            "postId": source.postId,
            "chunkId": source.chunkId,
            "ownerNickname": source.ownerNickname,
            "title": source.title,
            "sourceType": source.sourceType,
            "snippet": _truncate_source_text(
                source.snippet,
                settings.ai_summary_max_source_chars,
            ),
        }
        for source in sources
    ]
    return (
        "You summarize verified personal memory search evidence for Memento.\n"
        "Use only the provided sources. Do not infer private facts beyond them.\n"
        "Return strict JSON with keys: answer, sources. sources must contain "
        "objects with postId and summary.\n"
        f"Query: {request.query}\n"
        f"Scope: {request.scope}\n"
        "Sources:\n"
        f"{json.dumps(source_payload, ensure_ascii=False)}"
    )


def _parse_summary_payload(payload: dict) -> dict:
    output_text = payload.get("output_text")
    if not isinstance(output_text, str):
        output_text = _extract_output_text(payload)
    if not isinstance(output_text, str):
        raise SummaryProviderError(
            502,
            "SUMMARY_PROVIDER_INVALID_RESPONSE",
            "Summary provider returned no text output.",
        )

    try:
        parsed = json.loads(output_text)
    except ValueError as exc:
        raise SummaryProviderError(
            502,
            "SUMMARY_PROVIDER_INVALID_RESPONSE",
            "Summary provider returned non-JSON text output.",
        ) from exc

    if not isinstance(parsed, dict):
        raise SummaryProviderError(
            502,
            "SUMMARY_PROVIDER_INVALID_RESPONSE",
            "Summary provider returned a malformed JSON payload.",
        )
    return parsed


def _extract_output_text(payload: dict) -> str | None:
    output = payload.get("output")
    if not isinstance(output, list):
        return None
    chunks: list[str] = []
    for item in output:
        content = item.get("content") if isinstance(item, dict) else None
        if not isinstance(content, list):
            continue
        for content_item in content:
            if not isinstance(content_item, dict):
                continue
            text = content_item.get("text")
            if isinstance(text, str):
                chunks.append(text)
    return "".join(chunks) if chunks else None


def _map_provider_sources(
    requested_sources: list[SummarySource],
    raw_sources,
) -> list[SummarySourceSummary]:
    summaries_by_post_id: dict[str, str] = {}
    if isinstance(raw_sources, list):
        for raw_source in raw_sources:
            if not isinstance(raw_source, dict):
                continue
            post_id = raw_source.get("postId")
            summary = raw_source.get("summary")
            if isinstance(post_id, str) and isinstance(summary, str) and summary.strip():
                summaries_by_post_id[post_id] = summary.strip()

    return [
        _source_summary(
            source,
            summaries_by_post_id.get(source.postId, _short_summary(source.snippet)),
        )
        for source in requested_sources
    ]


def _usage_from_payload(payload: dict) -> SummaryUsage:
    usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
    return SummaryUsage(
        inputTokens=usage.get("input_tokens"),
        outputTokens=usage.get("output_tokens"),
        totalTokens=usage.get("total_tokens"),
    )


def _truncate_source_text(text: str, max_chars: int) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 3].rstrip() + "..."
