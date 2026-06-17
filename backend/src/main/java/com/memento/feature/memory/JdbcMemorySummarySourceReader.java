package com.memento.feature.memory;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcMemorySummarySourceReader implements MemorySummarySourceReader {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    JdbcMemorySummarySourceReader(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = new NamedParameterJdbcTemplate(jdbcTemplate);
    }

    @Override
    public List<MemorySummarySource> findSourcesForOwnerPostIds(UUID ownerId, List<UUID> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return List.of();
        }
        return jdbcTemplate.query(
                """
                SELECT DISTINCT ON (p.id)
                    p.id as post_id,
                    c.id as chunk_id,
                    c.owner_id,
                    u.nickname as owner_nickname,
                    p.title,
                    c.content as snippet,
                    c.source_kind,
                    c.created_at
                FROM posts p
                JOIN memory_chunks c ON c.post_id = p.id
                JOIN users u ON u.id = c.owner_id
                WHERE p.author_id = :ownerId
                  AND p.deleted_at IS NULL
                  AND c.owner_id = :ownerId
                  AND c.status = 'active'
                  AND p.id IN (:postIds)
                ORDER BY p.id,
                    CASE c.source_kind
                        WHEN 'post_content' THEN 0
                        WHEN 'post_title' THEN 1
                        WHEN 'tag' THEN 2
                        ELSE 3
                    END,
                    c.created_at DESC
                """,
                Map.of("ownerId", ownerId, "postIds", postIds),
                rowMapper());
    }

    private RowMapper<MemorySummarySource> rowMapper() {
        return (ResultSet rs, int rowNum) -> new MemorySummarySource(
                rs.getObject("post_id", UUID.class),
                rs.getObject("chunk_id", UUID.class),
                rs.getObject("owner_id", UUID.class),
                rs.getString("owner_nickname"),
                rs.getString("title"),
                rs.getString("snippet"),
                mapSourceType(rs.getString("source_kind")),
                instant(rs, "created_at"));
    }

    private String mapSourceType(String sourceKind) {
        return "tag".equals(sourceKind) ? "tag" : "post";
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }
}
