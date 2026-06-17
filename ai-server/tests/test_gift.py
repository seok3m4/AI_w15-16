import httpx
from fastapi.testclient import TestClient

from app.gift.models import GiftRecommendationRequest
from app.gift.providers import GiftRecommendationProviderError, OpenAIGiftRecommendationProvider
from app.main import app
from app.settings import Settings


def _gift_payload() -> dict:
    return {
        "requestId": "req-1",
        "jobId": None,
        "idempotencyKey": "gift-1",
        "friendId": "22222222-2222-2222-2222-222222222222",
        "occasion": "birthday",
        "preferences": "coffee",
        "budget": {"min": 30000, "max": 70000, "currency": "KRW"},
        "maxSources": 2,
        "sources": [
            {
                "postId": "post-1",
                "chunkId": "chunk-1",
                "ownerUserId": "22222222-2222-2222-2222-222222222222",
                "ownerNickname": "friend",
                "title": "Coffee notes",
                "snippet": "Recently interested in hand drip coffee.",
                "sourceType": "post",
                "createdAt": "2026-06-16T00:00:00Z",
            }
        ],
    }


def test_mock_gift_endpoint_returns_recommendations_with_sources(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)

    response = client.post("/internal/v1/friend-gift-recommendations", json=_gift_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "mock"
    assert body["friendId"] == "22222222-2222-2222-2222-222222222222"
    assert body["occasion"] == "birthday"
    assert body["recommendations"]
    assert body["sources"][0]["postId"] == "post-1"


def test_gift_endpoint_rejects_empty_sources(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)
    payload = _gift_payload()
    payload["sources"] = []

    response = client.post("/internal/v1/friend-gift-recommendations", json=payload)

    assert response.status_code == 400


def test_openai_gift_provider_sends_strict_json_request_and_maps_response() -> None:
    captured_request = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_request["authorization"] = request.headers["Authorization"]
        captured_request["json"] = request.read().decode("utf-8")
        return httpx.Response(
            200,
            json={
                "output_text": (
                    '{"answer":"Coffee sampler fits the shared records.",'
                    '"recommendations":[{"title":"Coffee sampler","reason":"Coffee was mentioned.","confidence":"medium"}],'
                    '"sources":[{"postId":"post-1","summary":"Coffee interest."}]}'
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
        ai_summary_model="gpt-5.4-mini",
        ai_summary_max_sources=5,
        ai_summary_max_source_chars=1200,
        ai_timeout_seconds=5,
    )
    provider = OpenAIGiftRecommendationProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    response = provider.recommend(GiftRecommendationRequest(**_gift_payload()))

    assert captured_request["authorization"] == "Bearer test-key"
    assert '"store":false' in captured_request["json"]
    assert '"name":"friend_gift_recommendation"' in captured_request["json"]
    assert "Do not infer private or sensitive facts" in captured_request["json"]
    assert response.answer == "Coffee sampler fits the shared records."
    assert response.recommendations[0].title == "Coffee sampler"
    assert response.sources[0].postId == "post-1"
    assert response.usage.totalTokens == 19


def test_openai_gift_provider_refusal_fails_safely() -> None:
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
    provider = OpenAIGiftRecommendationProvider(
        settings,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    try:
        provider.recommend(GiftRecommendationRequest(**_gift_payload()))
    except GiftRecommendationProviderError as exc:
        assert exc.code == "GIFT_PROVIDER_REFUSED"
    else:
        raise AssertionError("Expected refusal error")
