package com.memento.feature.memory;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
class McpMemoryToolAdapter implements McpMemoryToolPort {

    private final PostMemoryFeatureService memoryService;
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    McpMemoryToolAdapter(
            PostMemoryFeatureService memoryService,
            JdbcTemplate jdbcTemplate,
            Clock clock) {
        this.memoryService = memoryService;
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public SearchResult searchMemories(UUID ownerId, String query, int limit) {
        MemorySearchResponse response = memoryService.searchMemories(ownerId, new MemorySearchRequest(query, "me", limit));
        return new SearchResult(
                response.query(),
                response.scope(),
                response.results().stream().map(this::toResultItem).toList());
    }

    @Override
    @Transactional(readOnly = true)
    public FriendSearchResult searchFriendMemories(UUID callerId, UUID friendId, String query, int limit) {
        FriendMemorySearchResponse response =
                memoryService.searchFriendMemories(callerId, friendId, new FriendMemorySearchRequest(query, limit));
        return new FriendSearchResult(
                response.friendId(),
                response.query(),
                response.usedFriendContext(),
                response.results().stream().map(this::toResultItem).toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RecentPostsSummary summarizeRecentPosts(UUID ownerId, int days, int limit) {
        int normalizedDays = Math.min(Math.max(days, 1), 30);
        int normalizedLimit = Math.min(Math.max(limit, 1), 20);
        Instant since = clock.instant().minus(normalizedDays, ChronoUnit.DAYS);
        List<RecentPost> posts = jdbcTemplate.query(
                """
                        SELECT id, title, left(content, 240) AS preview, created_at
                        FROM posts
                        WHERE author_id = ?
                          AND deleted_at IS NULL
                          AND created_at >= ?
                        ORDER BY created_at DESC
                        LIMIT ?
                        """,
                this::mapRecentPost,
                ownerId,
                since,
                normalizedLimit);
        String summary = posts.isEmpty()
                ? "No recent posts found."
                : "Found " + posts.size() + " recent posts from the last " + normalizedDays + " days.";
        return new RecentPostsSummary(normalizedDays, normalizedLimit, summary, posts);
    }

    private ResultItem toResultItem(MemorySearchResultItem item) {
        return new ResultItem(
                item.postId(),
                item.chunkId(),
                item.ownerUserId(),
                item.ownerNickname(),
                item.title(),
                item.snippet(),
                item.score(),
                item.sourceType(),
                item.createdAt());
    }

    private RecentPost mapRecentPost(ResultSet rs, int rowNum) throws SQLException {
        return new RecentPost(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("preview"),
                rs.getObject("created_at", Instant.class));
    }
}

