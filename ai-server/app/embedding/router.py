from fastapi import APIRouter, HTTPException

from app.embedding.models import EmbeddingRequest, EmbeddingResponse
from app.embedding.providers import EmbeddingProviderError, build_embedding_provider
from app.settings import get_settings


router = APIRouter(prefix="/internal/v1", tags=["internal-embeddings"])


@router.post("/embeddings", response_model=EmbeddingResponse)
def create_embeddings(request: EmbeddingRequest) -> EmbeddingResponse:
    try:
        provider = build_embedding_provider(get_settings())
        return provider.embed(request)
    except EmbeddingProviderError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.safe_message},
        ) from exc
