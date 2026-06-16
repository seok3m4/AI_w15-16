import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.settings import Settings


def _capsule_payload() -> dict:
    return {
        "requestId": "req-1",
        "jobId": "11111111-1111-1111-1111-111111111111",
        "idempotencyKey": "idem-1",
        "purpose": "Share a concise project capsule with an external LLM",
        "query": "recent project decisions",
        "scope": "me",
        "maxSources": 2,
        "sources": [
            {
                "postId": "post-1",
                "chunkId": "chunk-1",
                "ownerUserId": "user-1",
                "ownerNickname": "cutan",
                "title": "Auth rollout note",
                "snippet": "Bearer access JWT with refresh rotation is active. Sessions are not stored server-side.",
                "sourceType": "post",
                "createdAt": "2026-06-15T03:10:00Z",
            },
            {
                "postId": "post-2",
                "chunkId": "chunk-2",
                "ownerUserId": "user-1",
                "ownerNickname": "cutan",
                "title": "Privacy policy checkpoint",
                "snippet": "Friend AI sharing stays opt-in. Existing capsules should keep citations visible.",
                "sourceType": "post",
            },
        ],
    }


def test_mock_capsule_endpoint_returns_summary_key_facts_and_tags(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)

    response = client.post("/internal/v1/context-capsule-drafts", json=_capsule_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "mock"
    assert body["model"] == "gpt-5.4-mini"
    assert body["purpose"] == "Share a concise project capsule with an external LLM"
    assert body["query"] == "recent project decisions"
    assert body["usedFriendContext"] is False
    assert "Share a concise project capsule" in body["summary"]
    assert len(body["keyFacts"]) >= 1
    assert "Bearer access JWT with refresh rotation is active." in body["keyFacts"]
    assert "auth" in body["tags"]


def test_capsule_endpoint_rejects_blank_purpose(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)
    payload = _capsule_payload()
    payload["purpose"] = "   "

    response = client.post("/internal/v1/context-capsule-drafts", json=payload)

    assert response.status_code == 400


def test_capsule_endpoint_rejects_empty_sources(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)
    payload = _capsule_payload()
    payload["sources"] = []

    response = client.post("/internal/v1/context-capsule-drafts", json=payload)

    assert response.status_code == 400


def test_capsule_endpoint_returns_502_when_openai_key_is_missing(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    client = TestClient(app)

    response = client.post("/internal/v1/context-capsule-drafts", json=_capsule_payload())

    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "OPENAI_API_KEY_MISSING"


def test_capsule_endpoint_rejects_unsupported_provider(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "unknown")
    client = TestClient(app)

    response = client.post("/internal/v1/context-capsule-drafts", json=_capsule_payload())

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "UNSUPPORTED_AI_PROVIDER"


def test_openai_capsule_provider_sends_responses_request_and_maps_json_response() -> None:
    from app.capsule.models import CapsuleDraftRequest
    from app.capsule.providers import OpenAICapsuleProvider

    captured_request = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_request["authorization"] = request.headers["Authorization"]
        captured_request["json"] = request.read().decode("utf-8")
        return httpx.Response(
            200,
            json={
                "output_text": (
                    '{"summary":"The capsule highlights auth and privacy choices.",'
                    '"keyFacts":["JWT bearer auth is active.","Friend AI sharing is opt-in."],'
                    '"tags":["auth","privacy"]}'
                ),
                "usage": {"input_tokens": 10, "output_tokens": 9, "total_tokens": 19},
            },
        )

    settings = Settings(
        ai_profile="local",
        ai_provider="openai",
        openai_api_key="test-key",
        ai_embedding_model="text-embedding-3-small",
        ai_embedding_dimension=1536,
        ai_timeout_seconds=5,
        ai_summary_model="gpt-5.4-mini",
        ai_summary_max_sources=5,
        ai_summary_max_source_chars=1200,
        ai_capsule_model="gpt-5.4-mini",
        ai_capsule_max_sources=5,
        ai_capsule_max_source_chars=1200,
        ai_capsule_max_key_facts=5,
        ai_capsule_max_tags=8,
    )
    provider = OpenAICapsuleProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    response = provider.generate_draft(CapsuleDraftRequest(**_capsule_payload()))

    assert captured_request["authorization"] == "Bearer test-key"
    assert '"store":false' in captured_request["json"]
    assert '"model":"gpt-5.4-mini"' in captured_request["json"]
    assert '"name":"context_capsule_draft"' in captured_request["json"]
    assert '"strict":true' in captured_request["json"]
    assert "recent project decisions" in captured_request["json"]
    assert "Auth rollout note" in captured_request["json"]
    assert response.provider == "openai"
    assert response.model == "gpt-5.4-mini"
    assert response.summary == "The capsule highlights auth and privacy choices."
    assert response.keyFacts == [
        "JWT bearer auth is active.",
        "Friend AI sharing is opt-in.",
    ]
    assert response.tags == ["auth", "privacy"]
    assert response.usage.totalTokens == 19


def test_openai_capsule_provider_invalid_json_fails_safely() -> None:
    from app.capsule.models import CapsuleDraftRequest
    from app.capsule.providers import OpenAICapsuleProvider, CapsuleProviderError

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"output_text": "not-json"})

    settings = Settings(
        ai_profile="local",
        ai_provider="openai",
        openai_api_key="test-key",
        ai_embedding_model="text-embedding-3-small",
        ai_embedding_dimension=1536,
        ai_timeout_seconds=5,
        ai_summary_model="gpt-5.4-mini",
        ai_summary_max_sources=5,
        ai_summary_max_source_chars=1200,
        ai_capsule_model="gpt-5.4-mini",
        ai_capsule_max_sources=5,
        ai_capsule_max_source_chars=1200,
        ai_capsule_max_key_facts=5,
        ai_capsule_max_tags=8,
    )
    provider = OpenAICapsuleProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    try:
        provider.generate_draft(CapsuleDraftRequest(**_capsule_payload()))
    except CapsuleProviderError as exc:
        assert exc.code == "CAPSULE_PROVIDER_INVALID_RESPONSE"
    else:
        raise AssertionError("Expected invalid response error")


def test_openai_capsule_provider_refusal_fails_safely() -> None:
    from app.capsule.models import CapsuleDraftRequest
    from app.capsule.providers import OpenAICapsuleProvider, CapsuleProviderError

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"refusal": "cannot comply"})

    settings = Settings(
        ai_profile="local",
        ai_provider="openai",
        openai_api_key="test-key",
        ai_embedding_model="text-embedding-3-small",
        ai_embedding_dimension=1536,
        ai_timeout_seconds=5,
        ai_summary_model="gpt-5.4-mini",
        ai_summary_max_sources=5,
        ai_summary_max_source_chars=1200,
        ai_capsule_model="gpt-5.4-mini",
        ai_capsule_max_sources=5,
        ai_capsule_max_source_chars=1200,
        ai_capsule_max_key_facts=5,
        ai_capsule_max_tags=8,
    )
    provider = OpenAICapsuleProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    try:
        provider.generate_draft(CapsuleDraftRequest(**_capsule_payload()))
    except CapsuleProviderError as exc:
        assert exc.code == "CAPSULE_PROVIDER_REFUSED"
    else:
        raise AssertionError("Expected refusal error")
