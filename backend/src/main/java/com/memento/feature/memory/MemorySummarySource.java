package com.memento.feature.memory;

import java.time.Instant;
import java.util.UUID;

record MemorySummarySource(
        UUID postId,
        UUID chunkId,
        UUID ownerUserId,
        String ownerNickname,
        String title,
        String snippet,
        String sourceType,
        Instant createdAt) {
}
