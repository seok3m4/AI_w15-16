from fastapi import APIRouter, HTTPException

from app.agent.models import AgentRunRequest, AgentRunResponse
from app.agent.providers import AgentProviderError, build_agent_provider
from app.settings import get_settings


router = APIRouter(prefix="/internal/v1", tags=["internal-agents"])


@router.post("/agent-runs/execute", response_model=AgentRunResponse)
def execute_agent_run(request: AgentRunRequest) -> AgentRunResponse:
    try:
        provider = build_agent_provider(get_settings())
        return provider.execute(request)
    except AgentProviderError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.safe_message},
        ) from exc
