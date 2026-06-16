import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.agent.models import AgentRunRequest, ToolExecutionResponse
from app.agent.providers import AgentProviderError, MockAgentProvider
from app.agent.tools import AgentToolClient
from app.settings import Settings


def _agent_payload(allowed_tools: list[str] | None = None) -> dict:
    return {
        "requestId": "req-agent-1",
        "runId": "run-1",
        "jobId": "job-1",
        "idempotencyKey": "idem-agent-1",
        "goal": "최근 기억을 바탕으로 주간 회고를 만들고 Notion에 저장해줘",
        "allowedTools": allowed_tools
        or ["search_memories", "summarize", "notion_export"],
        "userContext": {"userId": "user-1", "nickname": "cutan"},
        "scopeSummary": "본인 memory만 사용 가능",
    }


def _settings() -> Settings:
    return Settings(
        ai_profile="local",
        ai_provider="mock",
        openai_api_key="",
        ai_embedding_model="text-embedding-3-small",
        ai_embedding_dimension=1536,
        ai_summary_model="gpt-5.4-mini",
        ai_summary_max_sources=5,
        ai_summary_max_source_chars=1200,
        ai_capsule_model="gpt-5.4-mini",
        ai_capsule_max_sources=5,
        ai_capsule_max_source_chars=1200,
        ai_capsule_max_key_facts=5,
        ai_capsule_max_tags=8,
        ai_agent_model="gpt-5.4-mini",
        ai_agent_max_steps=8,
        ai_agent_timeout_seconds=60,
        ai_agent_tool_retry_limit=1,
        spring_internal_base_url="http://backend:8080",
        ai_timeout_seconds=5,
    )


class FakeToolClient(AgentToolClient):
    def __init__(self, approval_tool: str | None = None) -> None:
        self.approval_tool = approval_tool
        self.calls: list[str] = []

    def execute_tool(self, request):
        self.calls.append(request.toolName)
        if request.toolName == self.approval_tool:
            return ToolExecutionResponse(
                status="approval_required",
                outputSummary="사용자 승인이 필요합니다.",
                requiresApproval=True,
                approval={
                    "type": "external_write",
                    "description": "Notion 페이지를 생성합니다.",
                },
            )
        return ToolExecutionResponse(
            status="succeeded",
            outputSummary=f"{request.toolName} 실행 완료",
            output={"tool": request.toolName},
        )


class FlakyToolClient(AgentToolClient):
    def __init__(self) -> None:
        self.attempts = 0

    def execute_tool(self, request):
        self.attempts += 1
        if self.attempts == 1:
            return ToolExecutionResponse(
                status="failed",
                outputSummary="임시 오류",
                error={"code": "TEMPORARY_TOOL_ERROR", "message": "retryable"},
                retryable=True,
            )
        return ToolExecutionResponse(status="succeeded", outputSummary="재시도 성공")


def test_mock_agent_executes_only_allowed_tools() -> None:
    tool_client = FakeToolClient()
    provider = MockAgentProvider(_settings(), tool_client=tool_client)

    response = provider.execute(AgentRunRequest(**_agent_payload(["search_memories"])))

    assert response.provider == "mock"
    assert response.status == "succeeded"
    assert [step.toolName for step in response.steps] == ["search_memories"]
    assert tool_client.calls == ["search_memories"]
    assert response.pendingApproval is None


def test_mock_agent_stops_when_tool_requires_approval() -> None:
    tool_client = FakeToolClient(approval_tool="notion_export")
    provider = MockAgentProvider(_settings(), tool_client=tool_client)

    response = provider.execute(AgentRunRequest(**_agent_payload()))

    assert response.status == "approval_required"
    assert [step.toolName for step in response.steps] == [
        "search_memories",
        "summarize",
        "notion_export",
    ]
    assert response.pendingApproval is not None
    assert response.pendingApproval.type == "external_write"


def test_mock_agent_retries_retryable_tool_failure_once() -> None:
    tool_client = FlakyToolClient()
    provider = MockAgentProvider(_settings(), tool_client=tool_client)

    response = provider.execute(AgentRunRequest(**_agent_payload(["search_memories"])))

    assert response.status == "succeeded"
    assert tool_client.attempts == 2
    assert response.steps[0].status == "succeeded"


def test_agent_endpoint_rejects_blank_allowed_tool(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "mock")
    client = TestClient(app)
    payload = _agent_payload(["search_memories", "   "])

    response = client.post("/internal/v1/agent-runs/execute", json=payload)

    assert response.status_code == 400


def test_agent_endpoint_returns_502_when_openai_key_is_missing(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    client = TestClient(app)

    response = client.post("/internal/v1/agent-runs/execute", json=_agent_payload())

    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "OPENAI_API_KEY_MISSING"


def test_openai_agent_provider_sends_json_schema_plan_request() -> None:
    from app.agent.providers import OpenAIAgentProvider

    captured_request = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_request["authorization"] = request.headers["Authorization"]
        captured_request["json"] = request.read().decode("utf-8")
        return httpx.Response(
            200,
            json={
                "output_text": (
                    '{"steps":[{"toolName":"search_memories",'
                    '"input":{"query":"weekly review"},'
                    '"inputSummary":"최근 기억 검색"}]}'
                ),
                "usage": {"input_tokens": 12, "output_tokens": 8, "total_tokens": 20},
            },
        )

    settings = _settings()
    settings = Settings(
        **{
            **settings.__dict__,
            "ai_provider": "openai",
            "openai_api_key": "test-key",
        }
    )
    tool_client = FakeToolClient()
    provider = OpenAIAgentProvider(
        settings,
        tool_client=tool_client,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    response = provider.execute(AgentRunRequest(**_agent_payload(["search_memories"])))

    assert captured_request["authorization"] == "Bearer test-key"
    assert '"store":false' in captured_request["json"]
    assert '"name":"agent_tool_plan"' in captured_request["json"]
    assert "search_memories" in captured_request["json"]
    assert response.status == "succeeded"
    assert response.steps[0].toolName == "search_memories"


def test_openai_agent_provider_invalid_json_fails_safely() -> None:
    from app.agent.providers import OpenAIAgentProvider

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"output_text": "not-json"})

    settings = Settings(
        **{
            **_settings().__dict__,
            "ai_provider": "openai",
            "openai_api_key": "test-key",
        }
    )
    provider = OpenAIAgentProvider(
        settings,
        tool_client=FakeToolClient(),
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    try:
        provider.execute(AgentRunRequest(**_agent_payload(["search_memories"])))
    except AgentProviderError as exc:
        assert exc.code == "AGENT_PROVIDER_INVALID_RESPONSE"
    else:
        raise AssertionError("Expected invalid response error")
