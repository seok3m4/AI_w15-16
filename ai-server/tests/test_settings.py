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
    assert settings.ai_summary_model == "gpt-5.4-mini"
    assert settings.ai_summary_max_sources == 5
    assert settings.ai_summary_max_source_chars == 1200
    assert settings.ai_capsule_model == "gpt-5.4-mini"
    assert settings.ai_capsule_max_sources == 5
    assert settings.ai_capsule_max_source_chars == 1200
    assert settings.ai_capsule_max_key_facts == 5
    assert settings.ai_capsule_max_tags == 8
    assert settings.ai_agent_model == "gpt-5.4-mini"
    assert settings.ai_agent_max_steps == 8
    assert settings.ai_agent_timeout_seconds == 60
    assert settings.ai_agent_tool_retry_limit == 1
    assert settings.spring_internal_base_url == "http://backend:8080"
    assert settings.ai_timeout_seconds == 10


def test_settings_load_environment_values(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROFILE", "local")
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("AI_EMBEDDING_MODEL", "text-embedding-3-large")
    monkeypatch.setenv("AI_EMBEDDING_DIMENSION", "1536")
    monkeypatch.setenv("AI_SUMMARY_MODEL", "gpt-5.5")
    monkeypatch.setenv("AI_SUMMARY_MAX_SOURCES", "3")
    monkeypatch.setenv("AI_SUMMARY_MAX_SOURCE_CHARS", "800")
    monkeypatch.setenv("AI_CAPSULE_MODEL", "gpt-5.5-mini")
    monkeypatch.setenv("AI_CAPSULE_MAX_SOURCES", "4")
    monkeypatch.setenv("AI_CAPSULE_MAX_SOURCE_CHARS", "600")
    monkeypatch.setenv("AI_CAPSULE_MAX_KEY_FACTS", "4")
    monkeypatch.setenv("AI_CAPSULE_MAX_TAGS", "6")
    monkeypatch.setenv("AI_AGENT_MODEL", "gpt-5.5-mini")
    monkeypatch.setenv("AI_AGENT_MAX_STEPS", "4")
    monkeypatch.setenv("AI_AGENT_TIMEOUT_SECONDS", "30")
    monkeypatch.setenv("AI_AGENT_TOOL_RETRY_LIMIT", "2")
    monkeypatch.setenv("SPRING_INTERNAL_BASE_URL", "http://spring:8080")
    monkeypatch.setenv("AI_TIMEOUT_SECONDS", "5")

    settings = get_settings()

    assert settings.ai_profile == "local"
    assert settings.ai_provider == "openai"
    assert settings.openai_api_key == "test-key"
    assert settings.ai_embedding_model == "text-embedding-3-large"
    assert settings.ai_embedding_dimension == 1536
    assert settings.ai_summary_model == "gpt-5.5"
    assert settings.ai_summary_max_sources == 3
    assert settings.ai_summary_max_source_chars == 800
    assert settings.ai_capsule_model == "gpt-5.5-mini"
    assert settings.ai_capsule_max_sources == 4
    assert settings.ai_capsule_max_source_chars == 600
    assert settings.ai_capsule_max_key_facts == 4
    assert settings.ai_capsule_max_tags == 6
    assert settings.ai_agent_model == "gpt-5.5-mini"
    assert settings.ai_agent_max_steps == 4
    assert settings.ai_agent_timeout_seconds == 30
    assert settings.ai_agent_tool_retry_limit == 2
    assert settings.spring_internal_base_url == "http://spring:8080"
    assert settings.ai_timeout_seconds == 5
