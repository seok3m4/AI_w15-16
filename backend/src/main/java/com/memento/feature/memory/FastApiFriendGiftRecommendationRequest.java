package com.memento.feature.memory;

import java.util.List;
import java.util.UUID;

record FastApiFriendGiftRecommendationRequest(
        String requestId,
        UUID jobId,
        String idempotencyKey,
        UUID friendId,
        String occasion,
        GiftBudgetRequest budget,
        String preferences,
        int maxSources,
        List<FastApiGiftRecommendationInputSource> sources) {
}

record FastApiGiftRecommendationInputSource(
        UUID postId,
        UUID chunkId,
        UUID ownerUserId,
        String ownerNickname,
        String title,
        String snippet,
        String sourceType,
        String createdAt) {

    static FastApiGiftRecommendationInputSource from(MemoryVectorSearchCandidate candidate) {
        return new FastApiGiftRecommendationInputSource(
                candidate.postId(),
                candidate.chunkId(),
                candidate.ownerId(),
                candidate.ownerNickname(),
                candidate.title(),
                candidate.snippet(),
                candidate.sourceType().databaseValue(),
                candidate.createdAt() == null ? null : candidate.createdAt().toString());
    }
}
