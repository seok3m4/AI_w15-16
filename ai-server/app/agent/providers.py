import json
from typing import Protocol

import httpx

from app.agent.graph import execute_agent_graph
from app.agent.models import (
    AgentPlannedStep,
    AgentRunRequest,
    AgentRunResponse,
    AgentUsage,
)
from app.agent.tools import AgentToolClient, MockAgentToolClient, SpringAgentToolClient
from app.settings import Settings


class AgentProviderError(Exception):
    def __init__(self, status_code: int, code: str, safe_message: str) -> None:
        super().__init__(safe_message)
        self.status_code = status_code
        self.code = code
        self.safe_message = safe_message


class AgentProvider(Protocol):
    def execute(self, request: AgentRunRequest) -> AgentRunResponse:
        ...


class MockAgentProvider:
    def __init__(
        self,
        settings: Settings,
        tool_client: AgentToolClient | None = None,
    ) -> None:
        self.settings = settings
        self.tool_client = tool_client or MockAgentToolClient()

    def execute(self, request: AgentRunRequest) -> AgentRunResponse:
        planned_steps = _mock_plan(request, self.settings)
        return execute_agent_graph(
            request=request,
            planned_steps=planned_steps,
            provider="mock",
            model=self.settings.ai_agent_model,
            settings=self.settings,
            tool_client=self.tool_client,
            usage=AgentUsage(inputTokens=0, outputTokens=0, totalTokens=0),
        )


class OpenAIAgentProvider:
    endpoint = "https://api.openai.com/v1/responses"

    def __init__(
        self,
        settings: Settings,
        tool_client: AgentToolClient | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        self.settings = settings
        self.tool_client = tool_client or SpringAgentToolClient(settings)
        self.client = client or httpx.Client(timeout=settings.ai_agent_timeout_seconds)

    def execute(self, request: AgentRunRequest) -> AgentRunResponse:
        if not self.settings.openai_api_key:
            raise AgentProviderError(
                502,
                "OPENAI_API_KEY_MISSING",
                "OpenAI agent provider is not configured.",
            )

        try:
            response = self.client.post(
                self.endpoint,
                headers={
                    "Authorization": f"Bearer {self.settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "store": False,
                    "model": self.settings.ai_agent_model,
                    "input": _build_plan_prompt(request, self.settings),
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": "agent_tool_plan",
                            "strict": True,
                            "schema": _plan_response_schema(),
                        }
                    },
                },
            )
        except httpx.TimeoutException as exc:
            raise AgentProviderError(
                502,
                "AGENT_PROVIDER_TIMEOUT",
                "Agent provider timed out.",
            ) from exc
        except httpx.HTTPError as exc:
            raise AgentProviderError(
                502,
                "AGENT_PROVIDER_UNAVAILABLE",
                "Agent provider request failed.",
            ) from exc

        if response.status_code >= 400:
            raise AgentProviderError(
                502,
                "AGENT_PROVIDER_ERROR",
                "Agent provider returned an error.",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise AgentProviderError(
                502,
                "AGENT_PROVIDER_INVALID_RESPONSE",
                "Agent provider returned invalid JSON.",
            ) from exc

        planned_steps = _parse_provider_plan(payload, request)
        return execute_agent_graph(
            request=request,
            planned_steps=planned_steps,
            provider="openai",
            model=self.settings.ai_agent_model,
            settings=self.settings,
            tool_client=self.tool_client,
            usage=_usage_from_payload(payload),
        )


def build_agent_provider(settings: Settings) -> AgentProvider:
    provider = settings.ai_provider.lower()
    if provider == "mock":
        return MockAgentProvider(settings)
    if provider == "openai":
        return OpenAIAgentProvider(settings)
    raise AgentProviderError(
        400,
        "UNSUPPORTED_AI_PROVIDER",
        f"Unsupported AI provider: {settings.ai_provider}",
    )


def _mock_plan(
    request: AgentRunRequest,
    settings: Settings,
) -> list[AgentPlannedStep]:
    allowed = set(request.allowedTools)
    preferred_order = [
        "search_memories",
        "summarize",
        "create_context_capsule",
        "create_capsule",
        "create_post_draft",
        "notion_export",
        "search_posts",
    ]
    planned: list[AgentPlannedStep] = []
    for tool_name in preferred_order:
        if tool_name not in allowed:
            continue
        if tool_name == "notion_export" and "notion" not in request.goal.lower():
            continue
        planned.append(
            AgentPlannedStep(
                toolName=tool_name,
                input={"goal": request.goal},
                inputSummary=_input_summary(tool_name, request.goal),
            )
        )
        if len(planned) >= settings.ai_agent_max_steps:
            break
    if not planned:
        first_tool = request.allowedTools[0]
        planned.append(
            AgentPlannedStep(
                toolName=first_tool,
                input={"goal": request.goal},
                inputSummary=_input_summary(first_tool, request.goal),
            )
        )
    return planned[: settings.ai_agent_max_steps]


def _build_plan_prompt(request: AgentRunRequest, settings: Settings) -> str:
    payload = {
        "goal": request.goal,
        "allowedTools": request.allowedTools,
        "scopeSummary": request.scopeSummary,
        "maxSteps": min(
            request.maxSteps or settings.ai_agent_max_steps,
            settings.ai_agent_max_steps,
        ),
    }
    return (
        "You plan a Memento Agent run.\n"
        "Use only allowedTools. Do not include secrets or raw prompts.\n"
        "Return strict JSON with key steps. Each step must include "
        "toolName, input, and inputSummary.\n"
        f"{json.dumps(payload, ensure_ascii=False)}"
    )


def _parse_provider_plan(
    payload: dict,
    request: AgentRunRequest,
) -> list[AgentPlannedStep]:
    refusal = payload.get("refusal")
    if isinstance(refusal, str) and refusal.strip():
        raise AgentProviderError(
            502,
            "AGENT_PROVIDER_REFUSED",
            "Agent provider refused the request.",
        )

    output_text = payload.get("output_text")
    if not isinstance(output_text, str):
        output_text = _extract_output_text(payload)
    if not isinstance(output_text, str):
        raise AgentProviderError(
            502,
            "AGENT_PROVIDER_INVALID_RESPONSE",
            "Agent provider returned no text output.",
        )

    try:
        parsed = json.loads(output_text)
    except ValueError as exc:
        raise AgentProviderError(
            502,
            "AGENT_PROVIDER_INVALID_RESPONSE",
            "Agent provider returned non-JSON text output.",
        ) from exc

    raw_steps = parsed.get("steps") if isinstance(parsed, dict) else None
    if not isinstance(raw_steps, list) or not raw_steps:
        raise AgentProviderError(
            502,
            "AGENT_PROVIDER_INVALID_RESPONSE",
            "Agent provider returned no plan steps.",
        )

    allowed = set(request.allowedTools)
    planned_steps: list[AgentPlannedStep] = []
    for raw_step in raw_steps:
        if not isinstance(raw_step, dict):
            continue
        tool_name = raw_step.get("toolName")
        if not isinstance(tool_name, str) or tool_name not in allowed:
            continue
        step_input = raw_step.get("input")
        input_summary = raw_step.get("inputSummary")
        planned_steps.append(
            AgentPlannedStep(
                toolName=tool_name,
                input=step_input if isinstance(step_input, dict) else {},
                inputSummary=input_summary
                if isinstance(input_summary, str)
                else _input_summary(tool_name, request.goal),
            )
        )

    if not planned_steps:
        raise AgentProviderError(
            502,
            "AGENT_PROVIDER_INVALID_RESPONSE",
            "Agent provider returned no allowed plan steps.",
        )
    return planned_steps


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


def _usage_from_payload(payload: dict) -> AgentUsage:
    usage = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
    return AgentUsage(
        inputTokens=usage.get("input_tokens"),
        outputTokens=usage.get("output_tokens"),
        totalTokens=usage.get("total_tokens"),
    )


def _input_summary(tool_name: str, goal: str) -> str:
    normalized_goal = " ".join(goal.split())
    return f"{tool_name} for {normalized_goal[:80]}"


def _plan_response_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["steps"],
        "properties": {
            "steps": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["toolName", "input", "inputSummary"],
                    "properties": {
                        "toolName": {"type": "string"},
                        "input": {"type": "object"},
                        "inputSummary": {"type": "string"},
                    },
                },
            }
        },
    }
