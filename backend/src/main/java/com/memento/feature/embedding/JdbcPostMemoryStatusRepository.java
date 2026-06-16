package com.memento.feature.embedding;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcPostMemoryStatusRepository implements PostMemoryStatusRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcPostMemoryStatusRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void markRunning(UUID postId, UUID ownerId) {
        update(postId, ownerId, "running");
    }

    @Override
    public void markSucceeded(UUID postId, UUID ownerId) {
        update(postId, ownerId, "succeeded");
    }

    @Override
    public void markFailed(UUID postId, UUID ownerId) {
        update(postId, ownerId, "failed");
    }

    private void update(UUID postId, UUID ownerId, String status) {
        jdbcTemplate.update(
                """
                UPDATE posts
                SET memory_status = ?,
                    updated_at = now()
                WHERE id = ?
                  AND author_id = ?
                  AND deleted_at IS NULL
                """,
                status,
                postId,
                ownerId);
    }
}
