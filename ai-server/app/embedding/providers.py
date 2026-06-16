import hashlib
from typing import Protocol

import httpx

from app.embedding.models import (
    EmbeddingRequest,
    EmbeddingResponse,
    EmbeddingResult,
    EmbeddingUsage,
)
from app.settings import Settings


class EmbeddingProviderError(Exception):
    def __init__(self, status_code: int, code: str, safe_message: str) -> None:
        super().__init__(safe_message)
        self.status_code = status_code
        self.code = code
        self.safe_message = safe_message


class EmbeddingProvider(Protocol):
    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        ...


class MockEmbeddingProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        return EmbeddingResponse(
            provider="mock",
            model=self.settings.ai_embedding_model,
            dimension=self.settings.ai_embedding_dimension,
            embeddings=[
                EmbeddingResult(
                    id=item.id,
                    vector=_deterministic_vector(
                        item.text,
                        self.settings.ai_embedding_dimension,
                    ),
                    usage=EmbeddingUsage(promptTokens=0, totalTokens=0),
                )
                for item in request.items
            ],
        )


class OpenAIEmbeddingProvider:
    endpoint = "https://api.openai.com/v1/embeddings"

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(timeout=settings.ai_timeout_seconds)

    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        if not self.settings.openai_api_key:
            raise EmbeddingProviderError(
                502,
                "OPENAI_API_KEY_MISSING",
                "OpenAI embedding provider is not configured.",
            )

        try:
            response = self.client.post(
                self.endpoint,
                headers={
                    "Authorization": f"Bearer {self.settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.settings.ai_embedding_model,
                    "input": [item.text for item in request.items],
                    "encoding_format": "float",
                    "dimensions": self.settings.ai_embedding_dimension,
                },
            )
        except httpx.TimeoutException as exc:
            raise EmbeddingProviderError(
                502,
                "EMBEDDING_PROVIDER_TIMEOUT",
                "Embedding provider timed out.",
            ) from exc
        except httpx.HTTPError as exc:
            raise EmbeddingProviderError(
                502,
                "EMBEDDING_PROVIDER_UNAVAILABLE",
                "Embedding provider request failed.",
            ) from exc

        if response.status_code >= 400:
            raise EmbeddingProviderError(
                502,
                "EMBEDDING_PROVIDER_ERROR",
                "Embedding provider returned an error.",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise EmbeddingProviderError(
                502,
                "EMBEDDING_PROVIDER_INVALID_RESPONSE",
                "Embedding provider returned invalid JSON.",
            ) from exc

        data = payload.get("data")
        if not isinstance(data, list) or len(data) != len(request.items):
            raise EmbeddingProviderError(
                502,
                "EMBEDDING_PROVIDER_INVALID_RESPONSE",
                "Embedding provider returned an unexpected embedding count.",
            )

        usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
        results: list[EmbeddingResult] = []
        for index, item in enumerate(request.items):
            raw_embedding = (
                data[index].get("embedding") if isinstance(data[index], dict) else None
            )
            if not isinstance(raw_embedding, list):
                raise EmbeddingProviderError(
                    502,
                    "EMBEDDING_PROVIDER_INVALID_RESPONSE",
                    "Embedding provider returned a malformed vector.",
                )

            try:
                vector = [float(value) for value in raw_embedding]
            except (TypeError, ValueError) as exc:
                raise EmbeddingProviderError(
                    502,
                    "EMBEDDING_PROVIDER_INVALID_RESPONSE",
                    "Embedding provider returned a non-numeric vector.",
                ) from exc

            if len(vector) != self.settings.ai_embedding_dimension:
                raise EmbeddingProviderError(
                    502,
                    "EMBEDDING_DIMENSION_MISMATCH",
                    "Embedding provider returned an unexpected vector dimension.",
                )

            results.append(
                EmbeddingResult(
                    id=item.id,
                    vector=vector,
                    usage=EmbeddingUsage(
                        promptTokens=usage.get("prompt_tokens"),
                        totalTokens=usage.get("total_tokens"),
                    ),
                )
            )

        return EmbeddingResponse(
            provider="openai",
            model=self.settings.ai_embedding_model,
            dimension=self.settings.ai_embedding_dimension,
            embeddings=results,
        )


def build_embedding_provider(settings: Settings) -> EmbeddingProvider:
    provider = settings.ai_provider.lower()
    if provider == "mock":
        return MockEmbeddingProvider(settings)
    if provider == "openai":
        return OpenAIEmbeddingProvider(settings)
    raise EmbeddingProviderError(
        400,
        "UNSUPPORTED_AI_PROVIDER",
        f"Unsupported AI provider: {settings.ai_provider}",
    )


def _deterministic_vector(text: str, dimension: int) -> list[float]:
    values: list[float] = []
    for index in range(dimension):
        digest = hashlib.sha256(f"{text}:{index}".encode("utf-8")).digest()
        raw = int.from_bytes(digest[:4], "big") / 0xFFFFFFFF
        values.append(round((raw * 2.0) - 1.0, 6))
    return values
