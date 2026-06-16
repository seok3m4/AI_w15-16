package com.memento.feature.memory;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

record MemorySearchResponse(
        String query,
        String scope,
        List<MemorySearchResultItem> results) {

    static MemorySearchResponse of(String query, String scope, List<MemoryVectorSearchCandidate> candidates) {
        List<MemoryVectorSearchCandidate> safeCandidates = candidates == null ? List.of() : candidates;
        return new MemorySearchResponse(
                query,
                scope,
                safeCandidates.stream()
                        .map(MemorySearchResultItem::from)
                        .toList());
    }
}

record MemorySearchResultItem(
        UUID postId,
        UUID chunkId,
        UUID ownerUserId,
        String ownerNickname,
        String title,
        String snippet,
        double score,
        String sourceType,
        Instant createdAt) {

    static MemorySearchResultItem from(MemoryVectorSearchCandidate candidate) {
        return new MemorySearchResultItem(
                candidate.postId(),
                candidate.chunkId(),
                candidate.ownerId(),
                candidate.ownerNickname(),
                candidate.title(),
                candidate.snippet(),
                candidate.score(),
                candidate.sourceType().databaseValue(),
                candidate.createdAt());
    }
}
