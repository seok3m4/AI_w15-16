from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    ai_profile: str
    ai_provider: str
    openai_api_key: str
    ai_embedding_model: str
    ai_embedding_dimension: int
    ai_timeout_seconds: float


def get_settings() -> Settings:
    return Settings(
        ai_profile=os.getenv("AI_PROFILE", "local"),
        ai_provider=os.getenv("AI_PROVIDER", "mock"),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        ai_embedding_model=os.getenv("AI_EMBEDDING_MODEL", "text-embedding-3-small"),
        ai_embedding_dimension=int(os.getenv("AI_EMBEDDING_DIMENSION", "1536")),
        ai_timeout_seconds=float(os.getenv("AI_TIMEOUT_SECONDS", "10")),
    )
