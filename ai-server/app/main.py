from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.embedding.router import router as embedding_router

app = FastAPI(title="Memento AI Server")
app.include_router(embedding_router)


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
