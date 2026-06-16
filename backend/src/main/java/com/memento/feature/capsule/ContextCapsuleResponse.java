package com.memento.feature.capsule;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

record ContextCapsuleResponse(
        UUID id,
        String title,
        String purpose,
        String query,
        String summary,
        List<String> keyFacts,
        List<String> tags,
        boolean containsFriendContext,
        List<ContextCapsuleSourceResponse> sources,
        Instant createdAt,
        Instant updatedAt) {

    static ContextCapsuleResponse from(ContextCapsuleRecord record) {
        return new ContextCapsuleResponse(
                record.id(),
                record.title(),
                record.purpose(),
                record.query(),
                record.summary(),
                record.keyFacts(),
                record.tags(),
                record.containsFriendContext(),
                record.sources().stream().map(ContextCapsuleSourceResponse::from).toList(),
                record.createdAt(),
                record.updatedAt());
    }
}

record ContextCapsuleSourceResponse(
        UUID postId,
        UUID chunkId,
        UUID ownerUserId,
        String ownerNickname,
        String title,
        String snippet,
        String sourceType,
        Instant createdAt) {

    static ContextCapsuleSourceResponse from(ContextCapsuleSourceRecord source) {
        return new ContextCapsuleSourceResponse(
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
