package com.memento.feature.post;

import java.sql.Array;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcPostRepository implements PostRepository {

    private static final String POST_SELECT_COLUMNS_PREFIX = """
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
            """;

    private static final String POST_SELECT_COLUMNS_SUFFIX = """
                 AS access_scope,
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

    private static final String ACCEPTED_FRIENDSHIP_CONDITION = """
            EXISTS (
                SELECT 1
                FROM friendships f
                WHERE f.status = 'accepted'
                  AND (
                      (f.requester_id = ? AND f.addressee_id = p.author_id)
                      OR (f.addressee_id = ? AND f.requester_id = p.author_id)
                  )
            )
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

        linkTags(post.id(), post.authorId(), tagNames, post.createdAt());

        return findInsertedPost(post.id())
                .orElseThrow(() -> new PostCreationFailedException(post.id()));
    }

    private void linkTags(UUID postId, UUID authorId, List<String> tagNames, Instant linkedAt) {
        for (String tagName : tagNames) {
            String normalizedName = tagName.toLowerCase(Locale.ROOT);
            jdbcTemplate.update(
                    """
                    INSERT INTO tags (
                        id,
                        owner_id,
                        name,
                        normalized_name,
                        created_at
                    )
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT (owner_id, normalized_name) DO NOTHING
                    """,
                    UUID.randomUUID(),
                    authorId,
                    tagName,
                    normalizedName,
                    Timestamp.from(linkedAt));

            UUID tagId = jdbcTemplate.queryForObject(
                    """
                    SELECT id
                    FROM tags
                    WHERE owner_id = ?
                      AND normalized_name = ?
                    """,
                    UUID.class,
                    authorId,
                    normalizedName);
            if (tagId == null) {
                throw new IllegalStateException("Tag was upserted but could not be loaded.");
            }

            jdbcTemplate.update(
                    """
                    INSERT INTO post_tags (
                        post_id,
                        tag_id,
                        created_at
                    )
                    VALUES (?, ?, ?)
                    ON CONFLICT (post_id, tag_id) DO NOTHING
                    """,
                    postId,
                    tagId,
                    Timestamp.from(linkedAt));
        }
    }

    private Optional<PostRecord> findInsertedPost(UUID postId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    postSelectColumns("'me'")
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
    public List<PostRecord> findPageByAuthor(
            UUID authorId,
            String keyword,
            String normalizedTag,
            int limit,
            int offset) {
        String keywordPattern = keywordPattern(keyword);
        return jdbcTemplate.query(
                postSelectColumns("'me'")
                        + """
                        WHERE p.author_id = ?
                          AND p.deleted_at IS NULL
                          AND (
                              ?::varchar IS NULL
                              OR p.title ILIKE ?::varchar
                              OR p.content ILIKE ?::varchar
                              OR EXISTS (
                                  SELECT 1
                                  FROM comments c_search
                                  WHERE c_search.post_id = p.id
                                    AND c_search.deleted_at IS NULL
                                    AND c_search.content ILIKE ?::varchar
                              )
                              OR EXISTS (
                                  SELECT 1
                                  FROM post_tags pt_search
                                  JOIN tags t_search ON t_search.id = pt_search.tag_id
                                  WHERE pt_search.post_id = p.id
                                    AND t_search.owner_id = ?
                                    AND t_search.name ILIKE ?::varchar
                              )
                          )
                          AND (
                              ?::varchar IS NULL
                              OR EXISTS (
                                  SELECT 1
                                  FROM post_tags pt_filter
                                  JOIN tags t_filter ON t_filter.id = pt_filter.tag_id
                                  WHERE pt_filter.post_id = p.id
                                    AND t_filter.owner_id = ?
                                    AND t_filter.normalized_name = ?::varchar
                              )
                          )
                        ORDER BY p.created_at DESC, p.id DESC
                        LIMIT ?
                        OFFSET ?
                        """,
                this::mapPost,
                authorId,
                authorId,
                keywordPattern,
                keywordPattern,
                keywordPattern,
                keywordPattern,
                authorId,
                keywordPattern,
                normalizedTag,
                authorId,
                normalizedTag,
                limit,
                offset);
    }

    @Override
    public long countByAuthor(UUID authorId, String keyword, String normalizedTag) {
        String keywordPattern = keywordPattern(keyword);
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT count(*)
                FROM posts p
                WHERE p.author_id = ?
                  AND p.deleted_at IS NULL
                  AND (
                      ?::varchar IS NULL
                      OR p.title ILIKE ?::varchar
                      OR p.content ILIKE ?::varchar
                      OR EXISTS (
                          SELECT 1
                          FROM comments c_search
                          WHERE c_search.post_id = p.id
                            AND c_search.deleted_at IS NULL
                            AND c_search.content ILIKE ?::varchar
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM post_tags pt_search
                          JOIN tags t_search ON t_search.id = pt_search.tag_id
                          WHERE pt_search.post_id = p.id
                            AND t_search.owner_id = ?
                            AND t_search.name ILIKE ?::varchar
                      )
                  )
                  AND (
                      ?::varchar IS NULL
                      OR EXISTS (
                          SELECT 1
                          FROM post_tags pt_filter
                          JOIN tags t_filter ON t_filter.id = pt_filter.tag_id
                          WHERE pt_filter.post_id = p.id
                            AND t_filter.owner_id = ?
                            AND t_filter.normalized_name = ?::varchar
                      )
                  )
                """,
                Long.class,
                authorId,
                keywordPattern,
                keywordPattern,
                keywordPattern,
                keywordPattern,
                authorId,
                keywordPattern,
                normalizedTag,
                authorId,
                normalizedTag);
        return count == null ? 0 : count;
    }

    @Override
    public List<PostRecord> findPageByAcceptedFriends(UUID accessorId, int limit, int offset) {
        return jdbcTemplate.query(
                postSelectColumns("'friend'")
                        + """
                        JOIN friendships f ON f.status = 'accepted'
                          AND (
                              (f.requester_id = ? AND f.addressee_id = p.author_id)
                              OR (f.addressee_id = ? AND f.requester_id = p.author_id)
                          )
                        WHERE p.author_id <> ?
                          AND p.deleted_at IS NULL
                        ORDER BY p.created_at DESC, p.id DESC
                        LIMIT ?
                        OFFSET ?
                        """,
                this::mapPost,
                accessorId,
                accessorId,
                accessorId,
                accessorId,
                limit,
                offset);
    }

    @Override
    public long countByAcceptedFriends(UUID accessorId) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT count(*)
                FROM posts p
                JOIN friendships f ON f.status = 'accepted'
                  AND (
                      (f.requester_id = ? AND f.addressee_id = p.author_id)
                      OR (f.addressee_id = ? AND f.requester_id = p.author_id)
                  )
                WHERE p.author_id <> ?
                  AND p.deleted_at IS NULL
                """,
                Long.class,
                accessorId,
                accessorId,
                accessorId);
        return count == null ? 0 : count;
    }

    @Override
    public Optional<PostRecord> findByIdAndAuthor(UUID postId, UUID authorId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    postSelectColumns("'me'")
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

    @Override
    public Optional<PostRecord> findByIdAccessibleTo(UUID postId, UUID accessorId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    postSelectColumns("CASE WHEN p.author_id = ? THEN 'me' ELSE 'friend' END")
                            + """
                            WHERE p.id = ?
                              AND p.deleted_at IS NULL
                              AND (
                                  p.author_id = ?
                                  OR
                                  """ + ACCEPTED_FRIENDSHIP_CONDITION + """
                              )
                            """,
                    this::mapPost,
                    accessorId,
                    accessorId,
                    postId,
                    accessorId,
                    accessorId,
                    accessorId));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<PostRecord> updateByAuthor(
            UUID postId,
            UUID authorId,
            String title,
            String content,
            List<String> tagNames,
            Instant updatedAt) {
        int updatedRows = jdbcTemplate.update(
                """
                UPDATE posts
                SET title = ?,
                    content = ?,
                    memory_status = 'pending',
                    updated_at = ?
                WHERE id = ?
                  AND author_id = ?
                  AND deleted_at IS NULL
                """,
                title,
                content,
                Timestamp.from(updatedAt),
                postId,
                authorId);
        if (updatedRows == 0) {
            return Optional.empty();
        }

        jdbcTemplate.update(
                """
                DELETE FROM post_tags
                WHERE post_id = ?
                """,
                postId);
        linkTags(postId, authorId, tagNames, updatedAt);

        return findByIdAndAuthor(postId, authorId);
    }

    @Override
    public boolean softDeleteByAuthor(UUID postId, UUID authorId, Instant deletedAt) {
        int deletedRows = jdbcTemplate.update(
                """
                UPDATE posts
                SET deleted_at = ?,
                    updated_at = ?
                WHERE id = ?
                  AND author_id = ?
                  AND deleted_at IS NULL
                """,
                Timestamp.from(deletedAt),
                Timestamp.from(deletedAt),
                postId,
                authorId);
        if (deletedRows == 0) {
            return false;
        }

        jdbcTemplate.update(
                """
                UPDATE comments
                SET deleted_at = ?,
                    updated_at = ?
                WHERE post_id = ?
                  AND deleted_at IS NULL
                """,
                Timestamp.from(deletedAt),
                Timestamp.from(deletedAt),
                postId);
        jdbcTemplate.update(
                """
                DELETE FROM post_tags
                WHERE post_id = ?
                """,
                postId);
        return true;
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

    private String postSelectColumns(String accessScopeExpression) {
        return POST_SELECT_COLUMNS_PREFIX + accessScopeExpression + POST_SELECT_COLUMNS_SUFFIX;
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

    private String keywordPattern(String keyword) {
        return keyword == null ? null : "%" + keyword + "%";
    }
}
