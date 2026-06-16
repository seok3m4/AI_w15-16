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

    private static final String POST_SELECT_COLUMNS = """
            SELECT
                p.id,
                p.author_id,
                u.nickname AS author_nickname,
                p.title,
                p.content,
                COALESCE(tag_data.tags, ARRAY[]::varchar[]) AS tags,
                COALESCE(comment_data.comment_count, 0) AS comment_count,
                COALESCE(like_data.like_count, 0) AS like_count,
                EXISTS (
                    SELECT 1
                    FROM post_likes pl_me
                    WHERE pl_me.post_id = p.id
                      AND pl_me.user_id = ?
                ) AS liked_by_me,
                'me' AS access_scope,
                p.memory_status,
                p.created_at,
                p.updated_at
            FROM posts p
            JOIN users u ON u.id = p.author_id
            LEFT JOIN LATERAL (
                SELECT array_agg(t.name ORDER BY t.name)::varchar[] AS tags
                FROM post_tags pt
                JOIN tags t ON t.id = pt.tag_id
                WHERE pt.post_id = p.id
            ) tag_data ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::integer AS comment_count
                FROM comments c
                WHERE c.post_id = p.id
                  AND c.deleted_at IS NULL
            ) comment_data ON true
            LEFT JOIN LATERAL (
                SELECT count(*)::integer AS like_count
                FROM post_likes pl
                WHERE pl.post_id = p.id
            ) like_data ON true
            """;

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
                    POST_SELECT_COLUMNS
                            + """
                            WHERE p.id = ?
                              AND p.deleted_at IS NULL
                            """,
                    this::mapPost,
                    postId,
                    postId));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    @Override
    public List<PostRecord> findPageByAuthor(UUID authorId, int limit, int offset) {
        return jdbcTemplate.query(
                POST_SELECT_COLUMNS
                        + """
                        WHERE p.author_id = ?
                          AND p.deleted_at IS NULL
                        ORDER BY p.created_at DESC, p.id DESC
                        LIMIT ?
                        OFFSET ?
                        """,
                this::mapPost,
                authorId,
                authorId,
                limit,
                offset);
    }

    @Override
    public long countByAuthor(UUID authorId) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT count(*)
                FROM posts p
                WHERE p.author_id = ?
                  AND p.deleted_at IS NULL
                """,
                Long.class,
                authorId);
        return count == null ? 0 : count;
    }

    @Override
    public Optional<PostRecord> findByIdAndAuthor(UUID postId, UUID authorId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    POST_SELECT_COLUMNS
                            + """
                            WHERE p.id = ?
                              AND p.author_id = ?
                              AND p.deleted_at IS NULL
                            """,
                    this::mapPost,
                    authorId,
                    postId,
                    authorId));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    private PostRecord mapPost(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new PostRecord(
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
                rs.getTimestamp("updated_at").toInstant());
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
