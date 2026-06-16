from typing import Literal

from pydantic import BaseModel, Field, field_validator


InputType = Literal["memory_chunk", "query"]


class EmbeddingItem(BaseModel):
    id: str = Field(min_length=1)
    text: str

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("text must not be blank")
        return stripped


class EmbeddingRequest(BaseModel):
    requestId: str = Field(min_length=1)
    jobId: str | None = None
    idempotencyKey: str | None = None
    inputType: InputType
    items: list[EmbeddingItem] = Field(min_length=1)


class EmbeddingUsage(BaseModel):
    promptTokens: int | None = None
    totalTokens: int | None = None


class EmbeddingResult(BaseModel):
    id: str
    vector: list[float]
    usage: EmbeddingUsage = Field(default_factory=EmbeddingUsage)


class EmbeddingResponse(BaseModel):
    provider: str
    model: str
    dimension: int
    embeddings: list[EmbeddingResult]
