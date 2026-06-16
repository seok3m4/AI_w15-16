from typing import Literal

from pydantic import BaseModel, Field, field_validator


SummaryScope = Literal["me", "friends", "all_accessible"]
SourceType = Literal["post", "comment", "tag", "memory_chunk"]


class SummarySource(BaseModel):
    postId: str = Field(min_length=1)
    chunkId: str = Field(min_length=1)
    ownerUserId: str = Field(min_length=1)
    ownerNickname: str = Field(min_length=1)
    title: str
    snippet: str
    sourceType: SourceType
    createdAt: str | None = None

    @field_validator("title", "snippet")
    @classmethod
    def text_fields_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("text must not be blank")
        return stripped


class SummaryRequest(BaseModel):
    requestId: str = Field(min_length=1)
    jobId: str | None = None
    idempotencyKey: str | None = None
    query: str
    scope: SummaryScope
    maxSources: int = Field(default=5, ge=1, le=20)
    sources: list[SummarySource] = Field(min_length=1)

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("query must not be blank")
        return stripped


class SummaryUsage(BaseModel):
    inputTokens: int | None = None
    outputTokens: int | None = None
    totalTokens: int | None = None


class SummarySourceSummary(BaseModel):
    ownerUserId: str
    ownerNickname: str
    postId: str
    title: str
    sourceType: SourceType
    summary: str


class SummaryResponse(BaseModel):
    provider: str
    model: str
    query: str
    answer: str
    usedFriendContext: bool
    sources: list[SummarySourceSummary]
    usage: SummaryUsage = Field(default_factory=SummaryUsage)
