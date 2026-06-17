import json
from typing import Protocol

import httpx

from app.gift.models import (
    GiftRecommendationItem,
    GiftRecommendationRequest,
    GiftRecommendationResponse,
    GiftRecommendationSourceSummary,
    GiftSource,
    GiftUsage,
)
from app.settings import Settings


class GiftRecommendationProviderError(Exception):
    def __init__(self, status_code: int, code: str, safe_message: str) -> None:
        super().__init__(safe_message)
        self.status_code = status_code
        self.code = code
        self.safe_message = safe_message


class GiftRecommendationProvider(Protocol):
    def recommend(
        self,
        request: GiftRecommendationRequest,
    ) -> GiftRecommendationResponse:
        ...


class MockGiftRecommendationProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def recommend(
        self,
        request: GiftRecommendationRequest,
    ) -> GiftRecommendationResponse:
        sources = _select_sources(request, self.settings)
        source_summaries = [
            _source_summary(source, _short_summary(source.snippet))
            for source in sources
        ]
        first = source_summaries[0]
        title = f"{first.title} themed gift"
        return GiftRecommendationResponse(
            provider="mock",
            model=self.settings.ai_summary_model,
            friendId=request.friendId,
            occasion=request.occasion,
            answer=(
                f"Based only on {len(source_summaries)} shared source(s), "
                f"{title} is a cautious recommendation."
            ),
            recommendations=[
                GiftRecommendationItem(
                    title=title,
                    reason=f"Grounded in shared record: {first.summary}",
                    confidence="medium",
                )
            ],
            sources=source_summaries,
            usage=GiftUsage(inputTokens=0, outputTokens=0, totalTokens=0),
        )


class OpenAIGiftRecommendationProvider:
    endpoint = "https://api.openai.com/v1/responses"

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(timeout=settings.ai_timeout_seconds)

    def recommend(
        self,
        request: GiftRecommendationRequest,
    ) -> GiftRecommendationResponse:
        if not self.settings.openai_api_key:
            raise GiftRecommendationProviderError(
                502,
                "OPENAI_API_KEY_MISSING",
                "OpenAI gift recommendation provider is not configured.",
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
                    "store": False,
                    "model": self.settings.ai_summary_model,
                    "input": _build_prompt(request, sources, self.settings),
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": "friend_gift_recommendation",
                            "strict": True,
                            "schema": _gift_response_schema(),
                        }
                    },
                },
            )
        except httpx.TimeoutException as exc:
            raise GiftRecommendationProviderError(
                502,
                "GIFT_PROVIDER_TIMEOUT",
                "Gift recommendation provider timed out.",
            ) from exc
        except httpx.HTTPError as exc:
            raise GiftRecommendationProviderError(
                502,
                "GIFT_PROVIDER_UNAVAILABLE",
                "Gift recommendation provider request failed.",
            ) from exc

        if response.status_code >= 400:
            raise GiftRecommendationProviderError(
                502,
                "GIFT_PROVIDER_ERROR",
                "Gift recommendation provider returned an error.",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise GiftRecommendationProviderError(
                502,
                "GIFT_PROVIDER_INVALID_RESPONSE",
                "Gift recommendation provider returned invalid JSON.",
            ) from exc

        result = _parse_gift_payload(payload)
        answer = result.get("answer")
        if not isinstance(answer, str) or not answer.strip():
            raise GiftRecommendationProviderError(
                502,
                "GIFT_PROVIDER_INVALID_RESPONSE",
                "Gift recommendation provider returned a malformed answer.",
            )

        return GiftRecommendationResponse(
            provider="openai",
            model=self.settings.ai_summary_model,
            friendId=request.friendId,
            occasion=request.occasion,
            answer=answer.strip(),
            recommendations=_map_recommendations(result.get("recommendations")),
            sources=_map_provider_sources(sources, result.get("sources")),
            usage=_usage_from_payload(payload),
        )


def build_gift_provider(settings: Settings) -> GiftRecommendationProvider:
    provider = settings.ai_provider.lower()
    if provider == "mock":
        return MockGiftRecommendationProvider(settings)
    if provider == "openai":
        return OpenAIGiftRecommendationProvider(settings)
    raise GiftRecommendationProviderError(
        400,
        "UNSUPPORTED_AI_PROVIDER",
        f"Unsupported AI provider: {settings.ai_provider}",
    )


def _select_sources(
    request: GiftRecommendationRequest,
    settings: Settings,
) -> list[GiftSource]:
    limit = min(request.maxSources, settings.ai_summary_max_sources)
    return request.sources[:limit]


def _source_summary(source: GiftSource, summary: str) -> GiftRecommendationSourceSummary:
    return GiftRecommendationSourceSummary(
        ownerUserId=source.ownerUserId,
        ownerNickname=source.ownerNickname,
        postId=source.postId,
        title=source.title,
        sourceType=source.sourceType,
        summary=summary,
    )


def _short_summary(text: str) -> str:
    normalized = " ".join(text.split())
    for delimiter in (".", "!", "?"):
        if delimiter in normalized:
            first_sentence = normalized.split(delimiter, 1)[0].strip()
            if first_sentence:
                return f"{first_sentence}{delimiter}"
    return normalized[:240]


def _build_prompt(
    request: GiftRecommendationRequest,
    sources: list[GiftSource],
    settings: Settings,
) -> str:
    source_payload = [
        {
            "postId": source.postId,
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
        "You recommend gifts for a friend using Memento shared memory evidence.\n"
        "Use only the provided sources. Do not infer private or sensitive facts "
        "beyond the shared records. If evidence is weak, say so and keep "
        "confidence low or medium.\n"
        "Return strict JSON with keys: answer, recommendations, sources.\n"
        "recommendations items need title, reason, confidence(low|medium|high). "
        "sources items need postId and summary.\n"
        f"Occasion: {request.occasion}\n"
        f"Preferences from requester: {request.preferences or ''}\n"
        f"Budget: {request.budget.model_dump() if request.budget else None}\n"
        "Sources:\n"
        f"{json.dumps(source_payload, ensure_ascii=False)}"
    )


def _parse_gift_payload(payload: dict) -> dict:
    refusal = payload.get("refusal")
    if isinstance(refusal, str) and refusal.strip():
        raise GiftRecommendationProviderError(
            502,
            "GIFT_PROVIDER_REFUSED",
            "Gift recommendation provider refused the request.",
        )

    output_text = payload.get("output_text")
    if not isinstance(output_text, str):
        output_text = _extract_output_text(payload)
    if not isinstance(output_text, str):
        raise GiftRecommendationProviderError(
            502,
            "GIFT_PROVIDER_INVALID_RESPONSE",
            "Gift recommendation provider returned no text output.",
        )

    try:
        parsed = json.loads(output_text)
    except ValueError as exc:
        raise GiftRecommendationProviderError(
            502,
            "GIFT_PROVIDER_INVALID_RESPONSE",
            "Gift recommendation provider returned non-JSON text output.",
        ) from exc
    if not isinstance(parsed, dict):
        raise GiftRecommendationProviderError(
            502,
            "GIFT_PROVIDER_INVALID_RESPONSE",
            "Gift recommendation provider returned malformed JSON.",
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


def _map_recommendations(raw_recommendations) -> list[GiftRecommendationItem]:
    recommendations: list[GiftRecommendationItem] = []
    if isinstance(raw_recommendations, list):
        for raw in raw_recommendations:
            if not isinstance(raw, dict):
                continue
            title = raw.get("title")
            reason = raw.get("reason")
            confidence = raw.get("confidence")
            if isinstance(title, str) and title.strip() and isinstance(reason, str):
                recommendations.append(
                    GiftRecommendationItem(
                        title=title.strip(),
                        reason=reason.strip(),
                        confidence=confidence if confidence in {"low", "medium", "high"} else "medium",
                    )
                )
    if not recommendations:
        raise GiftRecommendationProviderError(
            502,
            "GIFT_PROVIDER_INVALID_RESPONSE",
            "Gift recommendation provider returned no recommendations.",
        )
    return recommendations


def _map_provider_sources(
    requested_sources: list[GiftSource],
    raw_sources,
) -> list[GiftRecommendationSourceSummary]:
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


def _usage_from_payload(payload: dict) -> GiftUsage:
    usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
    return GiftUsage(
        inputTokens=usage.get("input_tokens"),
        outputTokens=usage.get("output_tokens"),
        totalTokens=usage.get("total_tokens"),
    )


def _truncate_source_text(text: str, max_chars: int) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 3].rstrip() + "..."


def _gift_response_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["answer", "recommendations", "sources"],
        "properties": {
            "answer": {"type": "string"},
            "recommendations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["title", "reason", "confidence"],
                    "properties": {
                        "title": {"type": "string"},
                        "reason": {"type": "string"},
                        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    },
                },
            },
            "sources": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["postId", "summary"],
                    "properties": {
                        "postId": {"type": "string"},
                        "summary": {"type": "string"},
                    },
                },
            },
        },
    }
