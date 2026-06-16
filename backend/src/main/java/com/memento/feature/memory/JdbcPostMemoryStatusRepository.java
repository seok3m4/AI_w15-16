package com.memento.feature.memory;

import com.memento.feature.embedding.EmbeddingInputChunk;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository("postMemoryStatusReadRepository")
class JdbcPostMemoryStatusRepository implements PostMemoryStatusRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcPostMemoryStatusRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<PostMemoryStatus> findForOwnerAndPost(UUID ownerId, UUID postId) {
        return jdbcTemplate.query(
                """
                SELECT
                    p.id AS post_id,
                    p.memory_status AS chunk_status,
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM memory_embeddings e2
                            JOIN memory_chunks c2 ON c2.id = e2.chunk_id
                            WHERE c2.post_id = p.id
                              AND c2.owner_id = p.author_id
                              AND e2.status = 'failed'
                        ) THEN 'failed'
                        WHEN EXISTS (
                            SELECT 1
                            FROM memory_embeddings e3
                            JOIN memory_chunks c3 ON c3.id = e3.chunk_id
                            WHERE c3.post_id = p.id
                              AND c3.owner_id = p.author_id
                              AND e3.status = 'running'
                        ) THEN 'running'
                        WHEN EXISTS (
                            SELECT 1
                            FROM memory_embeddings e4
                            JOIN memory_chunks c4 ON c4.id = e4.chunk_id
                            WHERE c4.post_id = p.id
                              AND c4.owner_id = p.author_id
                              AND e4.status = 'pending'
                        ) THEN 'pending'
                        WHEN EXISTS (
                            SELECT 1
                            FROM memory_embeddings e5
                            JOIN memory_chunks c5 ON c5.id = e5.chunk_id
                            WHERE c5.post_id = p.id
                              AND c5.owner_id = p.author_id
                              AND e5.status = 'succeeded'
                        ) THEN 'succeeded'
                        ELSE 'pending'
                    END AS embedding_status,
                    (
                        SELECT MAX(e6.updated_at)
                        FROM memory_embeddings e6
                        JOIN memory_chunks c6 ON c6.id = e6.chunk_id
                        WHERE c6.post_id = p.id
                          AND c6.owner_id = p.author_id
                          AND e6.status = 'succeeded'
                    ) AS last_indexed_at,
                    (
                        SELECT e7.failure_reason
                        FROM memory_embeddings e7
                        JOIN memory_chunks c7 ON c7.id = e7.chunk_id
                        WHERE c7.post_id = p.id
                          AND c7.owner_id = p.author_id
                          AND e7.failure_reason IS NOT NULL
                        ORDER BY e7.updated_at DESC
                        LIMIT 1
                    ) AS failure_reason
                FROM posts p
                WHERE p.id = ?
                  AND p.author_id = ?
                  AND p.deleted_at IS NULL
                """,
                rowMapper(),
                postId,
                ownerId)
                .stream()
                .findFirst();
    }

    @Override
    public List<EmbeddingInputChunk> findActiveChunksForPost(UUID ownerId, UUID postId) {
        return jdbcTemplate.query(
                """
                SELECT id, content
                FROM memory_chunks
                WHERE owner_id = ?
                  AND post_id = ?
                  AND status = 'active'
                ORDER BY created_at ASC, id ASC
                """,
                (ResultSet rs, int rowNum) -> new EmbeddingInputChunk(
                        rs.getObject("id", UUID.class),
                        rs.getString("content")),
                ownerId,
                postId);
    }

    private RowMapper<PostMemoryStatus> rowMapper() {
        return (ResultSet rs, int rowNum) -> new PostMemoryStatus(
                rs.getObject("post_id", UUID.class),
                rs.getString("chunk_status"),
                rs.getString("embedding_status"),
                instant(rs, "last_indexed_at"),
                rs.getString("failure_reason"));
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }
}
