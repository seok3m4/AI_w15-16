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
    ai_summary_model: str = "gpt-5.4-mini"
    ai_summary_max_sources: int = 5
    ai_summary_max_source_chars: int = 1200
    ai_capsule_model: str = "gpt-5.4-mini"
    ai_capsule_max_sources: int = 5
    ai_capsule_max_source_chars: int = 1200
    ai_capsule_max_key_facts: int = 5
    ai_capsule_max_tags: int = 8


def get_settings() -> Settings:
    return Settings(
        ai_profile=os.getenv("AI_PROFILE", "local"),
        ai_provider=os.getenv("AI_PROVIDER", "mock"),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        ai_embedding_model=os.getenv("AI_EMBEDDING_MODEL", "text-embedding-3-small"),
        ai_embedding_dimension=int(os.getenv("AI_EMBEDDING_DIMENSION", "1536")),
        ai_summary_model=os.getenv("AI_SUMMARY_MODEL", "gpt-5.4-mini"),
        ai_summary_max_sources=int(os.getenv("AI_SUMMARY_MAX_SOURCES", "5")),
        ai_summary_max_source_chars=int(
            os.getenv("AI_SUMMARY_MAX_SOURCE_CHARS", "1200")
        ),
        ai_capsule_model=os.getenv("AI_CAPSULE_MODEL", "gpt-5.4-mini"),
        ai_capsule_max_sources=int(os.getenv("AI_CAPSULE_MAX_SOURCES", "5")),
        ai_capsule_max_source_chars=int(
            os.getenv("AI_CAPSULE_MAX_SOURCE_CHARS", "1200")
        ),
        ai_capsule_max_key_facts=int(os.getenv("AI_CAPSULE_MAX_KEY_FACTS", "5")),
        ai_capsule_max_tags=int(os.getenv("AI_CAPSULE_MAX_TAGS", "8")),
        ai_timeout_seconds=float(os.getenv("AI_TIMEOUT_SECONDS", "10")),
    )
