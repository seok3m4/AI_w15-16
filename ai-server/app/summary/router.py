from fastapi import APIRouter, HTTPException

from app.settings import get_settings
from app.summary.models import SummaryRequest, SummaryResponse
from app.summary.providers import SummaryProviderError, build_summary_provider


router = APIRouter(prefix="/internal/v1", tags=["internal-summaries"])


@router.post("/memory-summaries", response_model=SummaryResponse)
def create_memory_summary(request: SummaryRequest) -> SummaryResponse:
    try:
        provider = build_summary_provider(get_settings())
        return provider.summarize(request)
    except SummaryProviderError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.safe_message},
        ) from exc
