from app.main import app


def test_app_exposes_openapi_schema() -> None:
    schema = app.openapi()

    assert schema["info"]["title"] == "Memento AI Server"
    assert "/internal/v1/context-capsule-drafts" in schema["paths"]
    assert "/internal/v1/memory-summaries" in schema["paths"]
    assert "/internal/v1/agent-runs/execute" in schema["paths"]
