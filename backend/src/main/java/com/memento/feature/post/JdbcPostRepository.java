package com.memento.feature.post;

import java.sql.Array;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcPostRepository implements PostRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcPostRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public PostRecord save(NewPost post, List<String> tagNames) {
        jdbcTemplate.update(
                """
                INSERT INTO posts (
                    id,
                    author_id,
                    title,
                    content,
                    memory_status,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                post.id(),
                post.authorId(),
                post.title(),
                post.content(),
                post.memoryStatus(),
                Timestamp.from(post.createdAt()),
                Timestamp.from(post.createdAt()));

        return findById(post.id())
                .orElseThrow(() -> new PostCreationFailedException(post.id()));
    }

    @Override
    public Optional<PostRecord> findById(UUID postId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                    SELECT
                        p.id,
                        p.author_id,
                        u.nickname AS author_nickname,
                        p.title,
                        p.content,
                        ARRAY[]::varchar[] AS tags,
                        0 AS comment_count,
                        0 AS like_count,
                        false AS liked_by_me,
                        'me' AS access_scope,
                        p.memory_status,
                        p.created_at,
                        p.updated_at
                    FROM posts p
                    JOIN users u ON u.id = p.author_id
                    WHERE p.id = ?
                      AND p.deleted_at IS NULL
                    """,
                    (rs, rowNum) -> new PostRecord(
                            rs.getObject("id", UUID.class),
                            rs.getObject("author_id", UUID.class),
                            rs.getString("author_nickname"),
                            rs.getString("title"),
                            rs.getString("content"),
                            toStringList(rs.getArray("tags")),
                            rs.getInt("comment_count"),
                            rs.getInt("like_count"),
                            rs.getBoolean("liked_by_me"),
                            rs.getString("access_scope"),
                            rs.getString("memory_status"),
                            rs.getTimestamp("created_at").toInstant(),
                            rs.getTimestamp("updated_at").toInstant()),
                    postId));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    private List<String> toStringList(Array array) {
        if (array == null) {
            return List.of();
        }
        try {
            return List.of((String[]) array.getArray());
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to map post tags.", exception);
        }
    }
}
