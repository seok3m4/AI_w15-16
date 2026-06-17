package com.memento.feature.memory;

import java.util.List;
import java.util.UUID;

record FastApiMemorySummaryRequest(
        String requestId,
        UUID jobId,
        String idempotencyKey,
        String query,
        String scope,
        int maxSources,
        List<FastApiMemorySummarySource> sources) {
}

record FastApiMemorySummarySource(
        UUID postId,
        UUID chunkId,
        UUID ownerUserId,
        String ownerNickname,
        String title,
        String snippet,
        String sourceType,
        String createdAt) {

    static FastApiMemorySummarySource from(MemorySummarySource source) {
        return new FastApiMemorySummarySource(
                source.postId(),
                source.chunkId(),
                source.ownerUserId(),
                source.ownerNickname(),
                source.title(),
                source.snippet(),
                source.sourceType(),
                source.createdAt() == null ? null : source.createdAt().toString());
    }
}
