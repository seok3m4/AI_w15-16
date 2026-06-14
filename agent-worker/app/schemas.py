from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TraceStep(BaseModel):
    agent: str
    action: str
    guardrail: str
    result: str


class EvidenceItem(BaseModel):
    id: str
    type: str
    title: str
    sourceName: str
    sourceUrl: str
    observedAt: str | None = None
    snippet: str = ""
    payload: str = "{}"


class BriefingRequest(BaseModel):
    dashboard: dict[str, Any]
    model: str | None = None
    locale: str = "ko"


class BriefingResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str
    statusLabel: str
    koreaImpact: str
    risks: list[str] = Field(default_factory=list)
    evidenceMetricIds: list[str] = Field(default_factory=list)
    evidenceEventIds: list[str] = Field(default_factory=list)
    evidenceNewsIds: list[str] = Field(default_factory=list)
    evidenceRagChunkIds: list[str] = Field(default_factory=list)
    evidenceItems: list[EvidenceItem] = Field(default_factory=list)
    traceSteps: list[TraceStep] = Field(default_factory=list)


class ChatRequest(BaseModel):
    run: dict[str, Any]
    message: str
    dashboard: dict[str, Any]
    model: str | None = None
    toolPolicy: str | None = None
    agentId: str = "beginner-explainer"
    locale: str = "ko"


class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: str
    answerStatus: str = "answered"
    evidenceMetricIds: list[str] = Field(default_factory=list)
    evidenceEventIds: list[str] = Field(default_factory=list)
    evidenceNewsIds: list[str] = Field(default_factory=list)
    evidenceRagChunkIds: list[str] = Field(default_factory=list)
    evidenceItems: list[EvidenceItem] = Field(default_factory=list)
    traceSteps: list[TraceStep] = Field(default_factory=list)
