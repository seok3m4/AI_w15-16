package com.memento.feature.comment;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcCommentRepository implements CommentRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcCommentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<CommentRecord> saveOnOwnedPost(NewComment comment) {
        return jdbcTemplate.query(
                        """
                        WITH inserted AS (
                            INSERT INTO comments (
                                id,
                                post_id,
                                author_id,
                                content,
                                created_at,
                                updated_at
                            )
                            SELECT ?, ?, ?, ?, ?, ?
                            FROM posts p
                            WHERE p.id = ?
                              AND p.author_id = ?
                              AND p.deleted_at IS NULL
                            RETURNING id, post_id, author_id, content, created_at, updated_at
                        )
                        SELECT
                            i.id,
                            i.post_id,
                            i.author_id,
                            u.nickname AS author_nickname,
                            i.content,
                            i.created_at,
                            i.updated_at
                        FROM inserted i
                        JOIN users u ON u.id = i.author_id
                        """,
                        this::mapComment,
                        comment.id(),
                        comment.postId(),
                        comment.authorId(),
                        comment.content(),
                        Timestamp.from(comment.createdAt()),
                        Timestamp.from(comment.createdAt()),
                        comment.postId(),
                        comment.authorId())
                .stream()
                .findFirst();
    }

    @Override
    public Optional<CommentRecord> updateByAuthor(
            UUID commentId,
            UUID authorId,
            String content,
            java.time.Instant updatedAt) {
        return jdbcTemplate.query(
                        """
                        WITH updated AS (
                            UPDATE comments c
                            SET content = ?,
                                updated_at = ?
                            FROM posts p
                            WHERE c.post_id = p.id
                              AND c.id = ?
                              AND c.author_id = ?
                              AND c.deleted_at IS NULL
                              AND p.deleted_at IS NULL
                            RETURNING c.id, c.post_id, c.author_id, c.content, c.created_at, c.updated_at
                        )
                        SELECT
                            u_c.id,
                            u_c.post_id,
                            u_c.author_id,
                            u.nickname AS author_nickname,
                            u_c.content,
                            u_c.created_at,
                            u_c.updated_at
                        FROM updated u_c
                        JOIN users u ON u.id = u_c.author_id
                        """,
                        this::mapComment,
                        content,
                        Timestamp.from(updatedAt),
                        commentId,
                        authorId)
                .stream()
                .findFirst();
    }

    @Override
    public boolean softDeleteByAuthor(UUID commentId, UUID authorId, java.time.Instant deletedAt) {
        int deletedRows = jdbcTemplate.update(
                """
                UPDATE comments c
                SET deleted_at = ?,
                    updated_at = ?
                FROM posts p
                WHERE c.post_id = p.id
                  AND c.id = ?
                  AND c.author_id = ?
                  AND c.deleted_at IS NULL
                  AND p.deleted_at IS NULL
                """,
                Timestamp.from(deletedAt),
                Timestamp.from(deletedAt),
                commentId,
                authorId);
        return deletedRows > 0;
    }

    private CommentRecord mapComment(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new CommentRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("post_id", UUID.class),
                rs.getObject("author_id", UUID.class),
                rs.getString("author_nickname"),
                rs.getString("content"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant());
    }
}
