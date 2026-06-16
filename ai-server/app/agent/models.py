from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


AgentRunStatus = Literal["succeeded", "failed", "approval_required"]
ToolStatus = Literal["succeeded", "failed", "approval_required"]


class AgentUserContext(BaseModel):
    userId: str = Field(min_length=1)
    nickname: str | None = None


class AgentRunRequest(BaseModel):
    requestId: str = Field(min_length=1)
    runId: str = Field(min_length=1)
    jobId: str | None = None
    idempotencyKey: str | None = None
    goal: str
    allowedTools: list[str] = Field(min_length=1, max_length=20)
    userContext: AgentUserContext
    scopeSummary: str | None = None
    maxSteps: int | None = Field(default=None, ge=1, le=20)

    @field_validator("goal")
    @classmethod
    def goal_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("goal must not be blank")
        return stripped

    @field_validator("allowedTools")
    @classmethod
    def allowed_tools_must_be_unique_and_not_blank(
        cls,
        value: list[str],
    ) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for tool_name in value:
            stripped = tool_name.strip()
            if not stripped:
                raise ValueError("allowed tool must not be blank")
            if stripped in seen:
                continue
            normalized.append(stripped)
            seen.add(stripped)
        return normalized


class AgentPlannedStep(BaseModel):
    toolName: str = Field(min_length=1)
    input: dict[str, Any] = Field(default_factory=dict)
    inputSummary: str | None = None


class AgentPendingApproval(BaseModel):
    type: str = Field(min_length=1)
    description: str = Field(min_length=1)
    payload: dict[str, Any] | None = None


class AgentStepResult(BaseModel):
    stepOrder: int = Field(ge=1)
    toolName: str
    status: ToolStatus
    inputSummary: str | None = None
    outputSummary: str | None = None
    error: dict[str, Any] | None = None
    approval: AgentPendingApproval | None = None


class AgentUsage(BaseModel):
    inputTokens: int | None = None
    outputTokens: int | None = None
    totalTokens: int | None = None


class AgentRunResponse(BaseModel):
    provider: str
    model: str
    runId: str
    status: AgentRunStatus
    result: dict[str, Any] | None = None
    steps: list[AgentStepResult]
    pendingApproval: AgentPendingApproval | None = None
    failureReason: str | None = None
    usage: AgentUsage = Field(default_factory=AgentUsage)


class ToolExecutionRequest(BaseModel):
    requestId: str
    runId: str
    stepOrder: int = Field(ge=1)
    idempotencyKey: str | None = None
    toolName: str
    input: dict[str, Any] = Field(default_factory=dict)
    userContext: AgentUserContext
    scopeSummary: str | None = None


class ToolExecutionResponse(BaseModel):
    status: ToolStatus
    outputSummary: str | None = None
    output: dict[str, Any] | None = None
    requiresApproval: bool = False
    approval: AgentPendingApproval | dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    retryable: bool = False

    @field_validator("approval")
    @classmethod
    def coerce_approval(
        cls,
        value: AgentPendingApproval | dict[str, Any] | None,
    ) -> AgentPendingApproval | None:
        if value is None or isinstance(value, AgentPendingApproval):
            return value
        return AgentPendingApproval(**value)
