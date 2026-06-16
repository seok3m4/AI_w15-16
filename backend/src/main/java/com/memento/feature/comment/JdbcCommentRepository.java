package com.memento.feature.comment;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
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
                        (rs, rowNum) -> new CommentRecord(
                                rs.getObject("id", java.util.UUID.class),
                                rs.getObject("post_id", java.util.UUID.class),
                                rs.getObject("author_id", java.util.UUID.class),
                                rs.getString("author_nickname"),
                                rs.getString("content"),
                                rs.getTimestamp("created_at").toInstant(),
                                rs.getTimestamp("updated_at").toInstant()),
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
}
