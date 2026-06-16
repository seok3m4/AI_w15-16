import httpx
from fastapi.testclient import TestClient

from app.embedding.models import EmbeddingRequest
from app.embedding.providers import EmbeddingProviderError, OpenAIEmbeddingProvider
from app.main import app
from app.settings import Settings


def test_mock_embedding_endpoint_returns_deterministic_1536_dimension_vector(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)
    payload = {
        "requestId": "req-1",
        "jobId": "11111111-1111-1111-1111-111111111111",
        "idempotencyKey": "idem-1",
        "inputType": "memory_chunk",
        "items": [{"id": "chunk-1", "text": "오늘의 프로젝트 회고"}],
    }

    first = client.post("/internal/v1/embeddings", json=payload)
    second = client.post("/internal/v1/embeddings", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    first_body = first.json()
    second_body = second.json()
    assert first_body["provider"] == "mock"
    assert first_body["model"] == "text-embedding-3-small"
    assert first_body["dimension"] == 1536
    assert len(first_body["embeddings"][0]["vector"]) == 1536
    assert first_body["embeddings"][0]["vector"] == second_body["embeddings"][0]["vector"]


def test_embedding_endpoint_rejects_blank_text(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)

    response = client.post(
        "/internal/v1/embeddings",
        json={
            "requestId": "req-1",
            "inputType": "query",
            "items": [{"id": "query", "text": "   "}],
        },
    )

    assert response.status_code == 400


def test_embedding_endpoint_rejects_empty_items(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)

    response = client.post(
        "/internal/v1/embeddings",
        json={"requestId": "req-1", "inputType": "query", "items": []},
    )

    assert response.status_code == 400


def test_embedding_endpoint_returns_502_when_openai_key_is_missing(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    client = TestClient(app)

    response = client.post(
        "/internal/v1/embeddings",
        json={
            "requestId": "req-1",
            "inputType": "query",
            "items": [{"id": "query", "text": "hello"}],
        },
    )

    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "OPENAI_API_KEY_MISSING"


def test_embedding_endpoint_rejects_unsupported_provider(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "unknown")
    client = TestClient(app)

    response = client.post(
        "/internal/v1/embeddings",
        json={
            "requestId": "req-1",
            "inputType": "query",
            "items": [{"id": "query", "text": "hello"}],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "UNSUPPORTED_AI_PROVIDER"


def test_openai_provider_sends_embedding_request_and_maps_response() -> None:
    captured_request = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_request["authorization"] = request.headers["Authorization"]
        captured_request["json"] = request.read().decode("utf-8")
        return httpx.Response(
            200,
            json={
                "data": [{"embedding": [0.25, -0.5, 0.75]}],
                "usage": {"prompt_tokens": 4, "total_tokens": 4},
            },
        )

    settings = Settings(
        ai_profile="local",
        ai_provider="openai",
        openai_api_key="test-key",
        ai_embedding_model="text-embedding-3-small",
        ai_embedding_dimension=3,
        ai_timeout_seconds=5,
    )
    provider = OpenAIEmbeddingProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    response = provider.embed(
        EmbeddingRequest(
            requestId="req-1",
            inputType="memory_chunk",
            items=[{"id": "chunk-1", "text": "memory text"}],
        )
    )

    assert captured_request["authorization"] == "Bearer test-key"
    assert '"model":"text-embedding-3-small"' in captured_request["json"]
    assert '"input":["memory text"]' in captured_request["json"]
    assert '"encoding_format":"float"' in captured_request["json"]
    assert '"dimensions":3' in captured_request["json"]
    assert response.provider == "openai"
    assert response.dimension == 3
    assert response.embeddings[0].id == "chunk-1"
    assert response.embeddings[0].vector == [0.25, -0.5, 0.75]
    assert response.embeddings[0].usage.promptTokens == 4


def test_openai_provider_dimension_mismatch_fails() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"data": [{"embedding": [0.1]}]})

    settings = Settings(
        ai_profile="local",
        ai_provider="openai",
        openai_api_key="test-key",
        ai_embedding_model="text-embedding-3-small",
        ai_embedding_dimension=3,
        ai_timeout_seconds=5,
    )
    provider = OpenAIEmbeddingProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    try:
        provider.embed(
            EmbeddingRequest(
                requestId="req-1",
                inputType="query",
                items=[{"id": "query", "text": "hello"}],
            )
        )
    except EmbeddingProviderError as exc:
        assert exc.code == "EMBEDDING_DIMENSION_MISMATCH"
    else:
        raise AssertionError("Expected dimension mismatch error")
