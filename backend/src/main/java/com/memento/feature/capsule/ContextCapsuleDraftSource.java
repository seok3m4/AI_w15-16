package com.memento.feature.capsule;

import java.time.Instant;
import java.util.UUID;

record ContextCapsuleDraftSource(
        UUID postId,
        UUID chunkId,
        UUID ownerUserId,
        String ownerNickname,
        String title,
        String snippet,
        String sourceType,
        Instant createdAt) {

    static ContextCapsuleDraftSource from(ContextCapsuleSourceCandidate source) {
        return new ContextCapsuleDraftSource(
                source.postId(),
                source.chunkId(),
                source.ownerUserId(),
                source.ownerNickname(),
                source.title(),
                source.snippet(),
                source.sourceType(),
                source.createdAt());
    }
}
