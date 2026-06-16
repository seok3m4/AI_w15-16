from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.agent.models import (
    AgentPendingApproval,
    AgentPlannedStep,
    AgentRunRequest,
    AgentRunResponse,
    AgentStepResult,
    AgentUsage,
    ToolExecutionRequest,
)
from app.agent.tools import AgentToolClient
from app.settings import Settings


class AgentGraphState(TypedDict, total=False):
    request: AgentRunRequest
    provider: str
    model: str
    planned_steps: list[AgentPlannedStep]
    completed_steps: list[AgentStepResult]
    status: str
    pending_approval: AgentPendingApproval | None
    failure_reason: str | None
    usage: AgentUsage


def execute_agent_graph(
    *,
    request: AgentRunRequest,
    planned_steps: list[AgentPlannedStep],
    provider: str,
    model: str,
    settings: Settings,
    tool_client: AgentToolClient,
    usage: AgentUsage | None = None,
) -> AgentRunResponse:
    graph = _build_graph(settings, tool_client)
    state = graph.invoke(
        {
            "request": request,
            "provider": provider,
            "model": model,
            "planned_steps": planned_steps,
            "completed_steps": [],
            "status": "succeeded",
            "pending_approval": None,
            "failure_reason": None,
            "usage": usage or AgentUsage(),
        }
    )
    steps = state.get("completed_steps", [])
    status = state.get("status", "succeeded")
    pending_approval = state.get("pending_approval")
    failure_reason = state.get("failure_reason")
    result = None
    if status == "succeeded":
        result = {
            "summary": f"{len(steps)} agent tool step(s) completed.",
            "completedTools": [step.toolName for step in steps],
        }
    return AgentRunResponse(
        provider=provider,
        model=model,
        runId=request.runId,
        status=status,
        result=result,
        steps=steps,
        pendingApproval=pending_approval,
        failureReason=failure_reason,
        usage=state.get("usage", AgentUsage()),
    )


def _build_graph(settings: Settings, tool_client: AgentToolClient):
    builder = StateGraph(AgentGraphState)
    builder.add_node(
        "execute_steps",
        lambda state: _execute_steps(state, settings, tool_client),
    )
    builder.add_edge(START, "execute_steps")
    builder.add_edge("execute_steps", END)
    return builder.compile()


def _execute_steps(
    state: AgentGraphState,
    settings: Settings,
    tool_client: AgentToolClient,
) -> dict[str, Any]:
    request = state["request"]
    completed: list[AgentStepResult] = []
    status = "succeeded"
    pending_approval = None
    failure_reason = None
    max_steps = min(
        request.maxSteps or settings.ai_agent_max_steps,
        settings.ai_agent_max_steps,
    )

    for step_order, planned_step in enumerate(state.get("planned_steps", [])[:max_steps], 1):
        if planned_step.toolName not in request.allowedTools:
            status = "failed"
            failure_reason = f"Tool is not allowed: {planned_step.toolName}"
            completed.append(
                AgentStepResult(
                    stepOrder=step_order,
                    toolName=planned_step.toolName,
                    status="failed",
                    inputSummary=planned_step.inputSummary,
                    error={
                        "code": "AGENT_TOOL_NOT_ALLOWED",
                        "message": "Tool is not allowed for this run.",
                    },
                )
            )
            break

        tool_response = _execute_with_retry(
            request=request,
            planned_step=planned_step,
            step_order=step_order,
            settings=settings,
            tool_client=tool_client,
        )
        step_result = AgentStepResult(
            stepOrder=step_order,
            toolName=planned_step.toolName,
            status=tool_response.status,
            inputSummary=planned_step.inputSummary,
            outputSummary=tool_response.outputSummary,
            error=tool_response.error,
            approval=tool_response.approval,
        )
        completed.append(step_result)

        if tool_response.status == "approval_required":
            status = "approval_required"
            pending_approval = tool_response.approval
            break
        if tool_response.status == "failed":
            status = "failed"
            failure_reason = tool_response.outputSummary or "Agent tool failed."
            break

    return {
        "completed_steps": completed,
        "status": status,
        "pending_approval": pending_approval,
        "failure_reason": failure_reason,
    }


def _execute_with_retry(
    *,
    request: AgentRunRequest,
    planned_step: AgentPlannedStep,
    step_order: int,
    settings: Settings,
    tool_client: AgentToolClient,
):
    attempts = 0
    while True:
        attempts += 1
        response = tool_client.execute_tool(
            ToolExecutionRequest(
                requestId=request.requestId,
                runId=request.runId,
                stepOrder=step_order,
                idempotencyKey=_step_idempotency_key(request, step_order),
                toolName=planned_step.toolName,
                input=planned_step.input,
                userContext=request.userContext,
                scopeSummary=request.scopeSummary,
            )
        )
        if (
            response.status != "failed"
            or not response.retryable
            or attempts > settings.ai_agent_tool_retry_limit
        ):
            return response


def _step_idempotency_key(request: AgentRunRequest, step_order: int) -> str | None:
    if not request.idempotencyKey:
        return None
    return f"{request.idempotencyKey}:{step_order}"
