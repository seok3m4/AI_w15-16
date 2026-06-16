package com.memento.feature.memory;

import java.time.Instant;
import java.util.UUID;

record NewMemoryChunk(
        UUID id,
        UUID ownerId,
        UUID postId,
        UUID commentId,
        UUID tagId,
        MemorySourceKind sourceKind,
        String content,
        byte[] contentHash,
        Instant createdAt) {
}
