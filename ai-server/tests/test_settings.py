from app.settings import get_settings


def test_settings_load_local_defaults(monkeypatch) -> None:
    monkeypatch.delenv("AI_PROFILE", raising=False)
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    settings = get_settings()

    assert settings.ai_profile == "local"
    assert settings.ai_provider == "mock"
    assert settings.openai_api_key == ""
    assert settings.ai_embedding_model == "text-embedding-3-small"
    assert settings.ai_embedding_dimension == 1536
    assert settings.ai_timeout_seconds == 10


def test_settings_load_environment_values(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROFILE", "local")
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_EMBEDDING_MODEL", "text-embedding-3-large")
    monkeypatch.setenv("AI_EMBEDDING_DIMENSION", "1536")
    monkeypatch.setenv("AI_TIMEOUT_SECONDS", "5")

    settings = get_settings()

    assert settings.ai_profile == "local"
    assert settings.ai_provider == "openai"
    assert settings.openai_api_key == "test-key"
    assert settings.ai_embedding_model == "text-embedding-3-large"
    assert settings.ai_embedding_dimension == 1536
    assert settings.ai_timeout_seconds == 5
