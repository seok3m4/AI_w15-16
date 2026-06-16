package com.memento.feature.memory;

import java.time.Instant;
import java.util.UUID;

record MemoryVectorSearchCandidate(
        UUID postId,
        UUID chunkId,
        UUID ownerId,
        String title,
        String snippet,
        MemorySourceKind sourceType,
        double score,
        Instant createdAt) {
}
