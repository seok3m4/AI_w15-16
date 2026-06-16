import json
import re
from typing import Protocol

import httpx

from app.capsule.models import CapsuleDraftRequest, CapsuleDraftResponse, CapsuleUsage
from app.settings import Settings
from app.summary.models import SummarySource


class CapsuleProviderError(Exception):
    def __init__(self, status_code: int, code: str, safe_message: str) -> None:
        super().__init__(safe_message)
        self.status_code = status_code
        self.code = code
        self.safe_message = safe_message


class CapsuleProvider(Protocol):
    def generate_draft(self, request: CapsuleDraftRequest) -> CapsuleDraftResponse:
        ...


class MockCapsuleProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def generate_draft(self, request: CapsuleDraftRequest) -> CapsuleDraftResponse:
        sources = _select_sources(request, self.settings)
        key_facts = _mock_key_facts(sources, self.settings.ai_capsule_max_key_facts)
        tags = _mock_tags(
            request,
            sources,
            self.settings.ai_capsule_max_tags,
        )
        summary = _mock_summary(request, sources, key_facts)
        return CapsuleDraftResponse(
            provider="mock",
            model=self.settings.ai_capsule_model,
            purpose=request.purpose,
            query=request.query,
            summary=summary,
            keyFacts=key_facts,
            tags=tags,
            usedFriendContext=request.scope != "me",
            usage=CapsuleUsage(inputTokens=0, outputTokens=0, totalTokens=0),
        )


class OpenAICapsuleProvider:
    endpoint = "https://api.openai.com/v1/responses"

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(timeout=settings.ai_timeout_seconds)

    def generate_draft(self, request: CapsuleDraftRequest) -> CapsuleDraftResponse:
        if not self.settings.openai_api_key:
            raise CapsuleProviderError(
                502,
                "OPENAI_API_KEY_MISSING",
                "OpenAI capsule provider is not configured.",
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
                    "model": self.settings.ai_capsule_model,
                    "input": _build_prompt(request, sources, self.settings),
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": "context_capsule_draft",
                            "strict": True,
                            "schema": _capsule_response_schema(),
                        }
                    },
                },
            )
        except httpx.TimeoutException as exc:
            raise CapsuleProviderError(
                502,
                "CAPSULE_PROVIDER_TIMEOUT",
                "Capsule provider timed out.",
            ) from exc
        except httpx.HTTPError as exc:
            raise CapsuleProviderError(
                502,
                "CAPSULE_PROVIDER_UNAVAILABLE",
                "Capsule provider request failed.",
            ) from exc

        if response.status_code >= 400:
            raise CapsuleProviderError(
                502,
                "CAPSULE_PROVIDER_ERROR",
                "Capsule provider returned an error.",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise CapsuleProviderError(
                502,
                "CAPSULE_PROVIDER_INVALID_RESPONSE",
                "Capsule provider returned invalid JSON.",
            ) from exc

        result = _parse_capsule_payload(payload)
        summary = result.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            raise CapsuleProviderError(
                502,
                "CAPSULE_PROVIDER_INVALID_RESPONSE",
                "Capsule provider returned a malformed summary.",
            )

        return CapsuleDraftResponse(
            provider="openai",
            model=self.settings.ai_capsule_model,
            purpose=request.purpose,
            query=request.query,
            summary=summary.strip(),
            keyFacts=_normalize_string_list(
                result.get("keyFacts"),
                self.settings.ai_capsule_max_key_facts,
            ),
            tags=_normalize_string_list(
                result.get("tags"),
                self.settings.ai_capsule_max_tags,
            ),
            usedFriendContext=request.scope != "me",
            usage=_usage_from_payload(payload),
        )


def build_capsule_provider(settings: Settings) -> CapsuleProvider:
    provider = settings.ai_provider.lower()
    if provider == "mock":
        return MockCapsuleProvider(settings)
    if provider == "openai":
        return OpenAICapsuleProvider(settings)
    raise CapsuleProviderError(
        400,
        "UNSUPPORTED_AI_PROVIDER",
        f"Unsupported AI provider: {settings.ai_provider}",
    )


def _select_sources(
    request: CapsuleDraftRequest,
    settings: Settings,
) -> list[SummarySource]:
    limit = min(request.maxSources, settings.ai_capsule_max_sources)
    return request.sources[:limit]


def _mock_summary(
    request: CapsuleDraftRequest,
    sources: list[SummarySource],
    key_facts: list[str],
) -> str:
    lead = (
        f"Capsule for '{request.purpose}' uses {len(sources)} verified sources."
    )
    if key_facts:
        return f"{lead} {key_facts[0]}"
    return lead


def _mock_key_facts(sources: list[SummarySource], limit: int) -> list[str]:
    facts: list[str] = []
    seen: set[str] = set()
    for source in sources:
        fact = _first_sentence(source.snippet)
        if not fact:
            continue
        lowered = fact.casefold()
        if lowered in seen:
            continue
        facts.append(fact)
        seen.add(lowered)
        if len(facts) >= limit:
            break
    return facts


def _mock_tags(
    request: CapsuleDraftRequest,
    sources: list[SummarySource],
    limit: int,
) -> list[str]:
    tags: list[str] = []
    seen: set[str] = set()
    for text in [request.purpose, request.query or ""] + [source.title for source in sources]:
        for token in _keyword_tokens(text):
            lowered = token.casefold()
            if lowered in seen:
                continue
            tags.append(lowered)
            seen.add(lowered)
            if len(tags) >= limit:
                return tags
    if not tags:
        return ["capsule"]
    return tags


def _keyword_tokens(text: str) -> list[str]:
    stopwords = {
        "a",
        "an",
        "and",
        "are",
        "for",
        "is",
        "note",
        "recent",
        "share",
        "the",
        "to",
        "with",
    }
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9_-]{1,31}", text)
    return [token for token in tokens if token.casefold() not in stopwords]


def _first_sentence(text: str) -> str:
    normalized = " ".join(text.split())
    if not normalized:
        return ""
    for delimiter in (".", "!", "?"):
        if delimiter in normalized:
            first = normalized.split(delimiter, 1)[0].strip()
            if first:
                return f"{first}{delimiter}"
    return normalized[:240]


def _build_prompt(
    request: CapsuleDraftRequest,
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
                settings.ai_capsule_max_source_chars,
            ),
        }
        for source in sources
    ]
    return (
        "You generate a structured context capsule draft for Memento.\n"
        "Use only the provided verified sources.\n"
        "Do not query databases, decide permissions, or invent private facts.\n"
        "Return strict JSON with keys: summary, keyFacts, tags.\n"
        f"Purpose: {request.purpose}\n"
        f"Query: {request.query or ''}\n"
        f"Scope: {request.scope}\n"
        "Sources:\n"
        f"{json.dumps(source_payload, ensure_ascii=False)}"
    )


def _parse_capsule_payload(payload: dict) -> dict:
    refusal = payload.get("refusal")
    if isinstance(refusal, str) and refusal.strip():
        raise CapsuleProviderError(
            502,
            "CAPSULE_PROVIDER_REFUSED",
            "Capsule provider refused the request.",
        )

    output_text = payload.get("output_text")
    if not isinstance(output_text, str):
        output_text = _extract_output_text(payload)
    if not isinstance(output_text, str):
        raise CapsuleProviderError(
            502,
            "CAPSULE_PROVIDER_INVALID_RESPONSE",
            "Capsule provider returned no text output.",
        )

    try:
        parsed = json.loads(output_text)
    except ValueError as exc:
        raise CapsuleProviderError(
            502,
            "CAPSULE_PROVIDER_INVALID_RESPONSE",
            "Capsule provider returned non-JSON text output.",
        ) from exc

    if not isinstance(parsed, dict):
        raise CapsuleProviderError(
            502,
            "CAPSULE_PROVIDER_INVALID_RESPONSE",
            "Capsule provider returned a malformed JSON payload.",
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


def _normalize_string_list(raw_value, limit: int) -> list[str]:
    values: list[str] = []
    seen: set[str] = set()
    if not isinstance(raw_value, list):
        return values
    for raw_item in raw_value:
        if not isinstance(raw_item, str):
            continue
        stripped = raw_item.strip()
        if not stripped:
            continue
        lowered = stripped.casefold()
        if lowered in seen:
            continue
        values.append(stripped)
        seen.add(lowered)
        if len(values) >= limit:
            break
    return values


def _usage_from_payload(payload: dict) -> CapsuleUsage:
    usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
    return CapsuleUsage(
        inputTokens=usage.get("input_tokens"),
        outputTokens=usage.get("output_tokens"),
        totalTokens=usage.get("total_tokens"),
    )


def _truncate_source_text(text: str, max_chars: int) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 3].rstrip() + "..."


def _capsule_response_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["summary", "keyFacts", "tags"],
        "properties": {
            "summary": {"type": "string"},
            "keyFacts": {
                "type": "array",
                "items": {"type": "string"},
            },
            "tags": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
    }

