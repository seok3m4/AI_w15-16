from typing import Literal

from pydantic import BaseModel, Field, field_validator


SourceType = Literal["post", "comment", "tag", "memory_chunk", "post_content", "post_title"]
Confidence = Literal["low", "medium", "high"]


class GiftBudget(BaseModel):
    min: int | None = Field(default=None, ge=0)
    max: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=12)


class GiftSource(BaseModel):
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


class GiftRecommendationRequest(BaseModel):
    requestId: str = Field(min_length=1)
    jobId: str | None = None
    idempotencyKey: str | None = None
    friendId: str = Field(min_length=1)
    occasion: str = Field(default="birthday", min_length=1, max_length=80)
    preferences: str | None = Field(default=None, max_length=2000)
    budget: GiftBudget | None = None
    maxSources: int = Field(default=5, ge=1, le=20)
    sources: list[GiftSource] = Field(min_length=1)

    @field_validator("occasion")
    @classmethod
    def occasion_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("occasion must not be blank")
        return stripped


class GiftUsage(BaseModel):
    inputTokens: int | None = None
    outputTokens: int | None = None
    totalTokens: int | None = None


class GiftRecommendationItem(BaseModel):
    title: str
    reason: str
    confidence: Confidence = "medium"


class GiftRecommendationSourceSummary(BaseModel):
    ownerUserId: str
    ownerNickname: str
    postId: str
    title: str
    sourceType: SourceType
    summary: str


class GiftRecommendationResponse(BaseModel):
    provider: str
    model: str
    friendId: str
    occasion: str
    answer: str
    recommendations: list[GiftRecommendationItem]
    sources: list[GiftRecommendationSourceSummary]
    usage: GiftUsage = Field(default_factory=GiftUsage)
