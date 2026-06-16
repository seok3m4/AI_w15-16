from typing import Protocol

import httpx

from app.agent.models import ToolExecutionRequest, ToolExecutionResponse
from app.settings import Settings


class AgentToolClient(Protocol):
    def execute_tool(self, request: ToolExecutionRequest) -> ToolExecutionResponse:
        ...


class SpringAgentToolClient:
    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(timeout=settings.ai_agent_timeout_seconds)

    def execute_tool(self, request: ToolExecutionRequest) -> ToolExecutionResponse:
        endpoint = (
            f"{self.settings.spring_internal_base_url.rstrip('/')}"
            f"/internal/v1/agent-tools/{request.toolName}"
        )
        try:
            response = self.client.post(
                endpoint,
                json=request.model_dump(exclude_none=True),
            )
        except httpx.TimeoutException:
            return ToolExecutionResponse(
                status="failed",
                outputSummary="Agent tool request timed out.",
                error={"code": "AGENT_TOOL_TIMEOUT", "message": "Tool timed out."},
                retryable=True,
            )
        except httpx.HTTPError:
            return ToolExecutionResponse(
                status="failed",
                outputSummary="Agent tool request failed.",
                error={
                    "code": "AGENT_TOOL_UNAVAILABLE",
                    "message": "Tool request failed.",
                },
                retryable=True,
            )

        if response.status_code >= 400:
            return ToolExecutionResponse(
                status="failed",
                outputSummary="Agent tool returned an error.",
                error={
                    "code": "AGENT_TOOL_ERROR",
                    "message": f"Tool returned HTTP {response.status_code}.",
                },
                retryable=response.status_code >= 500,
            )

        try:
            payload = response.json()
        except ValueError:
            return ToolExecutionResponse(
                status="failed",
                outputSummary="Agent tool returned invalid JSON.",
                error={
                    "code": "AGENT_TOOL_INVALID_RESPONSE",
                    "message": "Tool response was not JSON.",
                },
            )

        return ToolExecutionResponse(**payload)


class MockAgentToolClient:
    def execute_tool(self, request: ToolExecutionRequest) -> ToolExecutionResponse:
        if request.toolName in {"notion_export", "create_post_draft"}:
            return ToolExecutionResponse(
                status="approval_required",
                outputSummary="사용자 승인이 필요합니다.",
                requiresApproval=True,
                approval={
                    "type": "external_write"
                    if request.toolName == "notion_export"
                    else "post_create",
                    "description": f"{request.toolName} 실행 전 승인이 필요합니다.",
                    "payload": {"toolName": request.toolName},
                },
            )
        return ToolExecutionResponse(
            status="succeeded",
            outputSummary=f"{request.toolName} 실행 완료",
            output={"toolName": request.toolName},
        )
