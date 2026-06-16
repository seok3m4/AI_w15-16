from fastapi import FastAPI

app = FastAPI(title="Memento AI Server")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-server"}
