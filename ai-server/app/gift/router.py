from fastapi import APIRouter, HTTPException

from app.gift.models import GiftRecommendationRequest, GiftRecommendationResponse
from app.gift.providers import GiftRecommendationProviderError, build_gift_provider
from app.settings import get_settings


router = APIRouter(prefix="/internal/v1", tags=["internal-gift"])


@router.post("/friend-gift-recommendations", response_model=GiftRecommendationResponse)
def create_friend_gift_recommendations(
    request: GiftRecommendationRequest,
) -> GiftRecommendationResponse:
    try:
        provider = build_gift_provider(get_settings())
        return provider.recommend(request)
    except GiftRecommendationProviderError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.safe_message},
        ) from exc
