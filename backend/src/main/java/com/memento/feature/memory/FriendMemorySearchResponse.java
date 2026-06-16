package com.memento.feature.memory;

import java.util.List;
import java.util.UUID;

record FriendMemorySearchResponse(
        UUID friendId,
        String query,
        boolean usedFriendContext,
        List<MemorySearchResultItem> results) {

    static FriendMemorySearchResponse of(
            UUID friendId,
            String query,
            boolean usedFriendContext,
            List<MemoryVectorSearchCandidate> candidates) {
        List<MemoryVectorSearchCandidate> safeCandidates = candidates == null ? List.of() : candidates;
        return new FriendMemorySearchResponse(
                friendId,
                query,
                usedFriendContext,
                safeCandidates.stream()
                        .map(MemorySearchResultItem::from)
                        .toList());
    }
}

