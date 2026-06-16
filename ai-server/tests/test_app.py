from app.main import app


def test_app_exposes_openapi_schema() -> None:
    schema = app.openapi()

    assert schema["info"]["title"] == "Memento AI Server"
