package com.memento.feature.memory;

import java.time.Instant;
import java.util.UUID;

record PostMemoryStatus(
        UUID postId,
        String chunkStatus,
        String embeddingStatus,
        Instant lastIndexedAt,
        String failureReason) {
}
