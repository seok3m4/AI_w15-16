from fastapi import APIRouter, HTTPException

from app.capsule.models import CapsuleDraftRequest, CapsuleDraftResponse
from app.capsule.providers import CapsuleProviderError, build_capsule_provider
from app.settings import get_settings


router = APIRouter(prefix="/internal/v1", tags=["internal-capsules"])


@router.post("/context-capsule-drafts", response_model=CapsuleDraftResponse)
def create_context_capsule_draft(
    request: CapsuleDraftRequest,
) -> CapsuleDraftResponse:
    try:
        provider = build_capsule_provider(get_settings())
        return provider.generate_draft(request)
    except CapsuleProviderError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.safe_message},
        ) from exc
