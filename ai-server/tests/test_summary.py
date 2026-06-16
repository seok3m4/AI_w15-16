import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.settings import Settings
from app.summary.models import SummaryRequest
from app.summary.providers import OpenAISummaryProvider, SummaryProviderError


def _summary_payload() -> dict:
    return {
        "requestId": "req-1",
        "jobId": "11111111-1111-1111-1111-111111111111",
        "idempotencyKey": "idem-1",
        "query": "인증 방식 결정 요약해줘",
        "scope": "me",
        "maxSources": 2,
        "sources": [
            {
                "postId": "post-1",
                "chunkId": "chunk-1",
                "ownerUserId": "user-1",
                "ownerNickname": "cutan",
                "title": "인증 구현 회고",
                "snippet": "Bearer access JWT와 HttpOnly refresh token rotation을 선택했다.",
                "sourceType": "post",
                "createdAt": "2026-06-15T03:10:00Z",
            },
            {
                "postId": "post-2",
                "chunkId": "chunk-2",
                "ownerUserId": "user-1",
                "ownerNickname": "cutan",
                "title": "토큰 저장 정책",
                "snippet": "refresh token 원문은 저장하지 않고 HMAC hash만 저장한다.",
                "sourceType": "post",
            },
        ],
    }


def test_mock_summary_endpoint_returns_answer_with_sources(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)

    response = client.post("/internal/v1/memory-summaries", json=_summary_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "mock"
    assert body["model"] == "gpt-5.4-mini"
    assert body["query"] == "인증 방식 결정 요약해줘"
    assert body["usedFriendContext"] is False
    assert "인증 방식 결정 요약해줘" in body["answer"]
    assert len(body["sources"]) == 2
    assert body["sources"][0]["postId"] == "post-1"
    assert body["sources"][0]["summary"] == "Bearer access JWT와 HttpOnly refresh token rotation을 선택했다."


def test_summary_endpoint_rejects_blank_query(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)
    payload = _summary_payload()
    payload["query"] = "   "

    response = client.post("/internal/v1/memory-summaries", json=payload)

    assert response.status_code == 400


def test_summary_endpoint_rejects_empty_sources(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)
    payload = _summary_payload()
    payload["sources"] = []

    response = client.post("/internal/v1/memory-summaries", json=payload)

    assert response.status_code == 400


def test_summary_endpoint_returns_502_when_openai_key_is_missing(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    client = TestClient(app)

    response = client.post("/internal/v1/memory-summaries", json=_summary_payload())

    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "OPENAI_API_KEY_MISSING"


def test_summary_endpoint_rejects_unsupported_provider(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "unknown")
    client = TestClient(app)

    response = client.post("/internal/v1/memory-summaries", json=_summary_payload())

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "UNSUPPORTED_AI_PROVIDER"


def test_openai_summary_provider_sends_responses_request_and_maps_json_response() -> None:
    captured_request = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_request["authorization"] = request.headers["Authorization"]
        captured_request["json"] = request.read().decode("utf-8")
        return httpx.Response(
            200,
            json={
                "output_text": (
                    '{"answer":"JWT Bearer와 refresh rotation을 선택했다.",'
                    '"sources":[{"postId":"post-1","summary":"JWT Bearer를 선택했다."}]}'
                ),
                "usage": {"input_tokens": 12, "output_tokens": 8, "total_tokens": 20},
            },
        )

    settings = Settings(
        ai_profile="local",
        ai_provider="openai",
        openai_api_key="test-key",
        ai_embedding_model="text-embedding-3-small",
        ai_embedding_dimension=1536,
        ai_summary_model="gpt-5.4-mini",
        ai_summary_max_sources=5,
        ai_summary_max_source_chars=1200,
        ai_timeout_seconds=5,
    )
    provider = OpenAISummaryProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    response = provider.summarize(SummaryRequest(**_summary_payload()))

    assert captured_request["authorization"] == "Bearer test-key"
    assert '"store":false' in captured_request["json"]
    assert '"model":"gpt-5.4-mini"' in captured_request["json"]
    assert '"text":{"format":{"type":"json_schema"' in captured_request["json"]
    assert '"name":"memory_summary"' in captured_request["json"]
    assert '"strict":true' in captured_request["json"]
    assert "인증 방식 결정 요약해줘" in captured_request["json"]
    assert "Bearer access JWT" in captured_request["json"]
    assert response.provider == "openai"
    assert response.model == "gpt-5.4-mini"
    assert response.answer == "JWT Bearer와 refresh rotation을 선택했다."
    assert response.sources[0].postId == "post-1"
    assert response.sources[0].summary == "JWT Bearer를 선택했다."
    assert response.usage.totalTokens == 20


def test_openai_summary_provider_invalid_json_fails_safely() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"output_text": "not-json"})

    settings = Settings(
        ai_profile="local",
        ai_provider="openai",
        openai_api_key="test-key",
        ai_embedding_model="text-embedding-3-small",
        ai_embedding_dimension=1536,
        ai_summary_model="gpt-5.4-mini",
        ai_summary_max_sources=5,
        ai_summary_max_source_chars=1200,
        ai_timeout_seconds=5,
    )
    provider = OpenAISummaryProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    try:
        provider.summarize(SummaryRequest(**_summary_payload()))
    except SummaryProviderError as exc:
        assert exc.code == "SUMMARY_PROVIDER_INVALID_RESPONSE"
    else:
        raise AssertionError("Expected invalid response error")


def test_openai_summary_provider_refusal_fails_safely() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"refusal": "cannot comply"})

    settings = Settings(
        ai_profile="local",
        ai_provider="openai",
        openai_api_key="test-key",
        ai_embedding_model="text-embedding-3-small",
        ai_embedding_dimension=1536,
        ai_summary_model="gpt-5.4-mini",
        ai_summary_max_sources=5,
        ai_summary_max_source_chars=1200,
        ai_timeout_seconds=5,
    )
    provider = OpenAISummaryProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    try:
        provider.summarize(SummaryRequest(**_summary_payload()))
    except SummaryProviderError as exc:
        assert exc.code == "SUMMARY_PROVIDER_REFUSED"
    else:
        raise AssertionError("Expected refusal error")
