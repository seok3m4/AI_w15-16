package com.memento.feature.capsule;

import java.time.Instant;
import java.util.UUID;

record ContextCapsuleSourceRecord(
        UUID postId,
        UUID chunkId,
        UUID ownerUserId,
        String ownerNickname,
        String title,
        String snippet,
        String sourceType,
        Instant createdAt) {

    static ContextCapsuleSourceRecord from(ContextCapsuleSourceCandidate source) {
        return new ContextCapsuleSourceRecord(
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
