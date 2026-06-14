from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException

from app.schemas import BriefingRequest, BriefingResponse, ChatRequest, ChatResponse
from app.service import run_briefing_agent, run_chat_agent
from app.mcp_server import build_mcp_app, build_mcp_server

mcp_server = build_mcp_server()
mcp_app = build_mcp_app(mcp_server)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if mcp_server is None:
        yield
        return
    async with mcp_server.session_manager.run():
        yield


app = FastAPI(title="US Economy Agent Worker", lifespan=lifespan)
if mcp_app is not None:
    app.mount("/mcp", mcp_app)


def verify_token(x_agent_worker_token: str | None) -> None:
    expected = os.getenv("AGENT_WORKER_TOKEN", "local-agent-token")
    if expected and x_agent_worker_token != expected:
        raise HTTPException(status_code=401, detail="Invalid agent worker token")


@app.post("/agent/briefing", response_model=BriefingResponse)
async def create_briefing(
    request: BriefingRequest,
    x_agent_worker_token: str | None = Header(default=None),
) -> BriefingResponse:
    verify_token(x_agent_worker_token)
    return await run_briefing_agent(request.dashboard, request.model, request.locale)


@app.post("/agent/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    x_agent_worker_token: str | None = Header(default=None),
) -> ChatResponse:
    verify_token(x_agent_worker_token)
    return await run_chat_agent(
        request.run,
        request.message,
        request.dashboard,
        request.model,
        request.toolPolicy,
        request.agentId,
        request.locale,
    )
