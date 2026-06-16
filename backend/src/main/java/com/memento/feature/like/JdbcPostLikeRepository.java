package com.memento.feature.like;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcPostLikeRepository implements PostLikeRepository {

    private static final String ACCESSIBLE_POST_CTE = """
            WITH accessible AS (
                SELECT p.id
                FROM posts p
                WHERE p.id = ?
                  AND p.deleted_at IS NULL
                  AND (
                      p.author_id = ?
                      OR EXISTS (
                          SELECT 1
                          FROM friendships f
                          WHERE f.status = 'accepted'
                            AND (
                                (f.requester_id = ? AND f.addressee_id = p.author_id)
                                OR (f.addressee_id = ? AND f.requester_id = p.author_id)
                            )
                      )
                  )
            )
            """;

    private final JdbcTemplate jdbcTemplate;

    JdbcPostLikeRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<PostLikeState> likeAccessiblePost(UUID postId, UUID userId, Instant likedAt) {
        return jdbcTemplate.query(
                        ACCESSIBLE_POST_CTE
                                + """
                                , inserted AS (
                                    INSERT INTO post_likes (
                                        post_id,
                                        user_id,
                                        created_at
                                    )
                                    SELECT a.id, ?, ?
                                    FROM accessible a
                                    ON CONFLICT (post_id, user_id) DO NOTHING
                                    RETURNING post_id
                                )
                                SELECT
                                    a.id AS post_id,
                                    EXISTS (
                                        SELECT 1
                                        FROM post_likes pl_me
                                        WHERE pl_me.post_id = a.id
                                          AND pl_me.user_id = ?
                                    ) AS liked_by_me,
                                    (
                                        SELECT count(*)::integer
                                        FROM post_likes pl
                                        WHERE pl.post_id = a.id
                                    ) AS like_count
                                FROM accessible a
                                """,
                        this::mapState,
                        postId,
                        userId,
                        userId,
                        userId,
                        userId,
                        Timestamp.from(likedAt),
                        userId)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<PostLikeState> unlikeAccessiblePost(UUID postId, UUID userId) {
        return jdbcTemplate.query(
                        ACCESSIBLE_POST_CTE
                                + """
                                , deleted AS (
                                    DELETE FROM post_likes pl
                                    USING accessible a
                                    WHERE pl.post_id = a.id
                                      AND pl.user_id = ?
                                    RETURNING pl.post_id
                                )
                                SELECT
                                    a.id AS post_id,
                                    EXISTS (
                                        SELECT 1
                                        FROM post_likes pl_me
                                        WHERE pl_me.post_id = a.id
                                          AND pl_me.user_id = ?
                                    ) AS liked_by_me,
                                    (
                                        SELECT count(*)::integer
                                        FROM post_likes pl
                                        WHERE pl.post_id = a.id
                                    ) AS like_count
                                FROM accessible a
                                """,
                        this::mapState,
                        postId,
                        userId,
                        userId,
                        userId,
                        userId,
                        userId)
                .stream()
                .findFirst();
    }

    private PostLikeState mapState(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new PostLikeState(
                rs.getObject("post_id", UUID.class),
                rs.getBoolean("liked_by_me"),
                rs.getInt("like_count"));
    }
}
