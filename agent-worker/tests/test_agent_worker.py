from app.guardrails import EvidenceGuardrailError, validate_evidence
from app.mcp_tools import (
    TOOL_ALLOWLIST,
    economic_indicator_search,
    latest_fred_snapshot,
    normalize_gdelt_articles,
    validate_tool_evidence,
)
from app.schemas import BriefingRequest, ChatRequest, ChatResponse
from app.service import build_fallback_briefing, build_fallback_chat, enforce_strict_chat_evidence, mcp_stream_url


def dashboard_payload():
    return {
        "brief": {
            "summary": "Inflation is cooling.",
            "statusLabel": "verified",
            "koreaImpact": "Watch FX pressure.",
            "risks": ["No investment advice."],
            "evidenceMetricIds": ["cpi"],
            "evidenceEventIds": [],
        },
        "metrics": [
            {
                "id": "cpi",
                "name": "CPI",
                "category": "Prices",
                "seriesId": "CPIAUCSL",
                "sourceName": "FRED",
                "sourceUrl": "https://fred.stlouisfed.org/series/CPIAUCSL",
            },
            {"id": "unsourced", "sourceUrl": ""},
        ],
        "events": [
            {"id": "cpi-release", "sourceUrl": "https://fred.stlouisfed.org/releases/calendar"}
        ],
        "reports": [],
    }


def test_validate_evidence_allows_only_sourced_metric_and_event_ids():
    validate_evidence(dashboard_payload(), ["cpi"], ["cpi-release"])


def test_validate_evidence_rejects_unknown_or_unsourced_ids():
    try:
        validate_evidence(dashboard_payload(), ["unsourced"], [])
    except EvidenceGuardrailError as error:
        assert "unsourced metric" in str(error)
    else:
        raise AssertionError("Expected EvidenceGuardrailError")


def test_fallback_briefing_preserves_schema_and_trace_steps():
    result = build_fallback_briefing(dashboard_payload(), "missing OPENAI_API_KEY")

    assert result.summary == "Inflation is cooling."
    assert result.statusLabel == "verified"
    assert result.evidenceMetricIds == ["cpi"]
    assert result.traceSteps[0].guardrail == "fallback-boundary"


def test_briefing_request_accepts_locale():
    request = BriefingRequest(
        dashboard=dashboard_payload(),
        model="test-model",
        locale="ja",
    )

    assert request.locale == "ja"


def test_fallback_briefing_uses_target_locale_when_dashboard_brief_is_missing():
    payload = dashboard_payload()
    payload["brief"] = {}

    result = build_fallback_briefing(payload, "missing OPENAI_API_KEY", "en")

    assert result.statusLabel == "fallback"
    assert result.summary == "Agent briefing is unavailable."


def test_fallback_chat_preserves_schema():
    result = build_fallback_chat("worker unavailable")

    assert result.answerStatus == "fallback"
    assert "worker unavailable" in result.answer
    assert result.evidenceMetricIds == []
    assert result.traceSteps[0].agent == "analysis-chat"


def test_fallback_chat_uses_target_locale():
    result = build_fallback_chat("worker unavailable", "beginner-explainer", "ko")

    assert result.answerStatus == "fallback"
    assert result.answer.startswith("Agent chat을 사용할 수 없습니다.")


def test_chat_request_accepts_selected_agent_id():
    request = ChatRequest(
        run={"run": {"id": 1}},
        message="CPI를 쉽게 설명해줘",
        dashboard=dashboard_payload(),
        agentId="beginner-explainer",
        locale="zh-Hans",
    )

    assert request.agentId == "beginner-explainer"
    assert request.locale == "zh-Hans"


def test_fallback_chat_uses_selected_agent_in_trace():
    result = build_fallback_chat("worker unavailable", "korea-impact")

    assert result.answerStatus == "fallback"
    assert result.traceSteps[0].agent == "korea-impact"


def test_chat_agent_profile_keeps_beginner_explainer_beginner_first():
    from app import service

    profile = service.chat_agent_profile("beginner-explainer")

    assert profile["name"] == "Beginner Explainer Agent"
    assert "초보자" in profile["instructions"]
    assert "쉬운" in profile["instructions"]


def test_mcp_stream_url_keeps_trailing_slash_to_avoid_fastapi_redirect():
    assert mcp_stream_url({}) == "http://localhost:8090/mcp/"
    assert mcp_stream_url({"AGENT_MCP_URL": "http://localhost:8090/mcp"}) == "http://localhost:8090/mcp/"
    assert mcp_stream_url({"AGENT_MCP_URL": "http://localhost:8090/mcp/"}) == "http://localhost:8090/mcp/"


def test_mcp_app_uses_mount_root_path_for_streamable_http():
    from app.mcp_server import build_mcp_app, build_mcp_server

    mcp_server = build_mcp_server()
    assert mcp_server is not None
    mcp_app = build_mcp_app(mcp_server)

    assert any(getattr(route, "path", None) == "/" for route in mcp_app.routes)


def test_strict_chat_evidence_downgrades_answered_response_without_evidence():
    result = enforce_strict_chat_evidence(
        ChatResponse(
            answer="Inflation is likely cooling.",
            answerStatus="answered",
        )
    )

    assert result.answerStatus == "insufficient_evidence"
    assert "검증 가능한 근거" in result.answer
    assert result.traceSteps[0].guardrail == "strict-evidence-required"


def test_strict_chat_evidence_keeps_answered_response_with_metric_evidence():
    result = enforce_strict_chat_evidence(
        ChatResponse(
            answer="CPI is the cited evidence.",
            answerStatus="answered",
            evidenceMetricIds=["cpi"],
        )
    )

    assert result.answerStatus == "answered"
    assert result.evidenceMetricIds == ["cpi"]


def test_mcp_tool_allowlist_exposes_only_read_only_economy_tools():
    assert TOOL_ALLOWLIST == {
        "economic_indicator_search",
        "latest_fred_snapshot",
        "related_news_search",
        "rag_search",
    }


def test_economic_indicator_search_and_latest_fred_snapshot_use_verified_dashboard():
    dashboard = dashboard_payload()

    indicator_results = economic_indicator_search(dashboard, "inflation", None, 5)
    fred_results = latest_fred_snapshot(dashboard, ["cpi"], [], 5)

    assert indicator_results[0]["id"] == "cpi"
    assert indicator_results[0]["sourceUrl"] == "https://fred.stlouisfed.org/series/CPIAUCSL"
    assert fred_results[0]["id"] == "cpi"
    assert fred_results[0]["sourceName"] == "FRED"


def test_gdelt_articles_are_normalized_into_sourced_news_evidence_items():
    result = normalize_gdelt_articles(
        [
            {
                "url": "https://example.com/fed-cpi",
                "title": "Fed watches CPI path",
                "sourcecountry": "United States",
                "domain": "example.com",
                "seendate": "20260613T010000Z",
            }
        ]
    )

    assert result[0]["id"].startswith("news-gdelt-")
    assert result[0]["type"] == "news"
    assert result[0]["sourceName"] == "example.com"
    assert result[0]["sourceUrl"] == "https://example.com/fed-cpi"
    assert result[0]["publishedAt"] == "2026-06-13T01:00:00Z"


def test_discussion_retriever_converts_backend_rag_results_to_documents():
    from app.discussion_retriever import DiscussionRetriever

    def backend_search(query, source_types, limit):
        assert query == "usd krw pressure"
        assert source_types == ["BOARD_POST"]
        assert limit == 2
        return [
            {
                "id": "rag-chunk-7",
                "sourceType": "BOARD_POST",
                "sourceId": "42",
                "title": "CPI and dollar-won discussion",
                "sourceName": "BOARD_POST",
                "sourceUrl": "/home?view=discussion&postId=42",
                "snippet": "Discussion connects CPI pressure with USD/KRW.",
                "observedAt": "2026-06-15T08:00:00Z",
                "score": 0.91,
            }
        ]

    retriever = DiscussionRetriever(backend_search=backend_search, source_types=["BOARD_POST"], limit=2)
    documents = retriever.invoke("usd krw pressure")

    assert documents[0].page_content == "Discussion connects CPI pressure with USD/KRW."
    assert documents[0].metadata["id"] == "rag-chunk-7"
    assert documents[0].metadata["sourceUrl"] == "/home?view=discussion&postId=42"
    assert documents[0].metadata["score"] == 0.91


def test_rag_search_uses_discussion_retriever_for_sourced_evidence_items(monkeypatch):
    from app import mcp_tools

    class FakeDiscussionRetriever:
        def __init__(self, backend_search, source_types, limit):
            self.backend_search = backend_search
            self.source_types = source_types
            self.limit = limit

        def search_evidence_items(self, query):
            assert query == "cpi exchange rate"
            assert self.source_types == ["BOARD_POST"]
            assert self.limit == 3
            return [
                {
                    "id": "rag-chunk-7",
                    "type": "rag",
                    "title": "CPI and dollar-won discussion",
                    "sourceName": "BOARD_POST",
                    "sourceUrl": "/home?view=discussion&postId=42",
                    "observedAt": "2026-06-15T08:00:00Z",
                    "snippet": "Discussion connects CPI pressure with USD/KRW.",
                    "payload": '{"sourceType":"BOARD_POST","sourceId":"42","score":0.91}',
                }
            ]

    monkeypatch.setattr(mcp_tools, "DiscussionRetriever", FakeDiscussionRetriever)

    results = mcp_tools.rag_search("cpi exchange rate", ["BOARD_POST"], 3)

    assert results[0]["id"] == "rag-chunk-7"
    assert results[0]["type"] == "rag"
    assert results[0]["sourceName"] == "BOARD_POST"
    assert results[0]["sourceUrl"] == "/home?view=discussion&postId=42"


def test_tool_evidence_guardrail_rejects_missing_or_unsourced_news_and_rag_ids():
    sourced_items = [
        {
            "id": "news-gdelt-1",
            "type": "news",
            "sourceUrl": "https://example.com/news",
        },
        {
            "id": "rag-chunk-1",
            "type": "rag",
            "sourceUrl": "/api/posts/1",
        },
    ]
    validate_tool_evidence(["news-gdelt-1"], ["rag-chunk-1"], sourced_items)

    try:
        validate_tool_evidence(["news-gdelt-missing"], [], sourced_items)
    except EvidenceGuardrailError as error:
        assert "unknown or unsourced news" in str(error)
    else:
        raise AssertionError("Expected EvidenceGuardrailError")
