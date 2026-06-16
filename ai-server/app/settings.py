from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    ai_profile: str
    ai_provider: str
    openai_api_key: str


def get_settings() -> Settings:
    return Settings(
        ai_profile=os.getenv("AI_PROFILE", "local"),
        ai_provider=os.getenv("AI_PROVIDER", "mock"),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
    )
