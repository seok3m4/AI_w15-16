package com.memento.feature.capsule;

import java.time.Instant;
import java.util.UUID;

record ContextCapsuleSourceCandidate(
        UUID postId,
        UUID chunkId,
        UUID ownerUserId,
        String ownerNickname,
        String title,
        String snippet,
        String sourceType,
        Instant createdAt) {
}
