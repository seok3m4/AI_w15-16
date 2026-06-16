from pydantic import BaseModel, Field, field_validator

from app.summary.models import SummaryScope, SummarySource


class CapsuleDraftRequest(BaseModel):
    requestId: str = Field(min_length=1)
    jobId: str | None = None
    idempotencyKey: str | None = None
    purpose: str
    query: str | None = None
    scope: SummaryScope
    maxSources: int = Field(default=5, ge=1, le=20)
    sources: list[SummarySource] = Field(min_length=1)

    @field_validator("purpose")
    @classmethod
    def purpose_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("purpose must not be blank")
        return stripped

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank_when_present(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("query must not be blank")
        return stripped


class CapsuleUsage(BaseModel):
    inputTokens: int | None = None
    outputTokens: int | None = None
    totalTokens: int | None = None


class CapsuleDraftResponse(BaseModel):
    provider: str
    model: str
    purpose: str
    query: str | None = None
    summary: str
    keyFacts: list[str]
    tags: list[str]
    usedFriendContext: bool
    usage: CapsuleUsage = Field(default_factory=CapsuleUsage)

