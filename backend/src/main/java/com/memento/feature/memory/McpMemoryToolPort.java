package com.memento.feature.memory;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface McpMemoryToolPort {

    SearchResult searchMemories(UUID ownerId, String query, int limit);

    FriendSearchResult searchFriendMemories(UUID callerId, UUID friendId, String query, int limit);

    RecentPostsSummary summarizeRecentPosts(UUID ownerId, int days, int limit);

    record SearchResult(
            String query,
            String scope,
            List<ResultItem> results) {
    }

    record FriendSearchResult(
            UUID friendId,
            String query,
            boolean usedFriendContext,
            List<ResultItem> results) {
    }

    record RecentPostsSummary(
            int days,
            int limit,
            String summary,
            List<RecentPost> posts) {
    }

    record ResultItem(
            UUID postId,
            UUID chunkId,
            UUID ownerUserId,
            String ownerNickname,
            String title,
            String snippet,
            double score,
            String sourceType,
            Instant createdAt) {
    }

    record RecentPost(
            UUID postId,
            String title,
            String preview,
            Instant createdAt) {
    }
}

