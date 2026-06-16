package com.memento.feature.memory;

import java.time.Instant;
import java.util.UUID;

record PostMemoryStatusResponse(
        UUID postId,
        String chunkStatus,
        String embeddingStatus,
        Instant lastIndexedAt,
        String failureReason) {

    static PostMemoryStatusResponse from(PostMemoryStatus status) {
        return new PostMemoryStatusResponse(
                status.postId(),
                status.chunkStatus(),
                status.embeddingStatus(),
                status.lastIndexedAt(),
                status.failureReason());
    }
}
