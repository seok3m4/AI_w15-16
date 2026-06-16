from app.settings import get_settings


def test_settings_load_local_defaults(monkeypatch) -> None:
    monkeypatch.delenv("AI_PROFILE", raising=False)
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    settings = get_settings()

    assert settings.ai_profile == "local"
    assert settings.ai_provider == "mock"
    assert settings.openai_api_key == ""


def test_settings_load_environment_values(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROFILE", "local")
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    settings = get_settings()

    assert settings.ai_profile == "local"
    assert settings.ai_provider == "openai"
    assert settings.openai_api_key == "test-key"
