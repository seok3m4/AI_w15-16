from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.agent.router import router as agent_router
from app.capsule.router import router as capsule_router
from app.embedding.router import router as embedding_router
from app.summary.router import router as summary_router

app = FastAPI(title="Memento AI Server")
app.include_router(agent_router)
app.include_router(capsule_router)
app.include_router(embedding_router)
app.include_router(summary_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request,
    exc: RequestValidationError,
) -> JSONResponse:
    errors = [
        {"loc": error["loc"], "msg": error["msg"], "type": error["type"]}
        for error in exc.errors()
    ]
    return JSONResponse(status_code=400, content={"detail": errors})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-server"}
