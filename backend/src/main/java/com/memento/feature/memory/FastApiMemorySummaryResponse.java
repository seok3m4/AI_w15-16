package com.memento.feature.memory;

import java.util.List;
import java.util.UUID;

record FastApiMemorySummaryResponse(
        String provider,
        String model,
        String query,
        String answer,
        boolean usedFriendContext,
        List<FastApiMemorySummarySourceResponse> sources,
        FastApiMemorySummaryUsage usage) {

    MemorySummaryResponse toApiResponse() {
        List<FastApiMemorySummarySourceResponse> safeSources = sources == null ? List.of() : sources;
        return new MemorySummaryResponse(
                query,
                answer,
                usedFriendContext,
                safeSources.stream()
                        .map(FastApiMemorySummarySourceResponse::toApiResponse)
                        .toList());
    }
}

record FastApiMemorySummarySourceResponse(
        UUID ownerUserId,
        String ownerNickname,
        UUID postId,
        String title,
        String sourceType,
        String summary) {

    MemorySummarySourceResponse toApiResponse() {
        return new MemorySummarySourceResponse(
                ownerUserId,
                ownerNickname,
                postId,
                title,
                sourceType,
                summary);
    }
}

record FastApiMemorySummaryUsage(
        Integer inputTokens,
        Integer outputTokens,
        Integer totalTokens) {
}
