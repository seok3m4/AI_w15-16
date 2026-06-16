package com.memento.feature.memory;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcMemoryChunkRepository implements MemoryChunkRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcMemoryChunkRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<PostMemorySource> findActivePostSource(UUID postId, UUID ownerId) {
        List<PostMemorySourceRow> rows = jdbcTemplate.query(
                """
                SELECT
                    p.id AS post_id,
                    p.author_id AS owner_id,
                    p.title,
                    p.content,
                    t.id AS tag_id,
                    t.name AS tag_name
                FROM posts p
                LEFT JOIN post_tags pt ON pt.post_id = p.id
                LEFT JOIN tags t ON t.id = pt.tag_id
                    AND t.owner_id = p.author_id
                WHERE p.id = ?
                  AND p.author_id = ?
                  AND p.deleted_at IS NULL
                ORDER BY t.name ASC, t.id ASC
                """,
                this::mapPostMemorySourceRow,
                postId,
                ownerId);
        if (rows.isEmpty()) {
            return Optional.empty();
        }

        PostMemorySourceRow first = rows.getFirst();
        List<PostMemoryTagSource> tags = new ArrayList<>();
        for (PostMemorySourceRow row : rows) {
            if (row.tagId() != null) {
                tags.add(new PostMemoryTagSource(row.tagId(), row.tagName()));
            }
        }
        return Optional.of(new PostMemorySource(
                first.postId(),
                first.ownerId(),
                first.title(),
                first.content(),
                List.copyOf(tags)));
    }

    @Override
    public void saveAll(List<NewMemoryChunk> chunks) {
        if (chunks.isEmpty()) {
            return;
        }
        List<Object[]> batchArgs = chunks.stream()
                .map(chunk -> new Object[] {
                    chunk.id(),
                    chunk.ownerId(),
                    chunk.postId(),
                    chunk.commentId(),
                    chunk.tagId(),
                    chunk.sourceKind().databaseValue(),
                    chunk.content(),
                    chunk.contentHash(),
                    Timestamp.from(chunk.createdAt()),
                    Timestamp.from(chunk.createdAt())
                })
                .toList();
        jdbcTemplate.batchUpdate(
                """
                INSERT INTO memory_chunks (
                    id,
                    owner_id,
                    post_id,
                    comment_id,
                    tag_id,
                    source_kind,
                    content,
                    content_hash,
                    token_count,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'active', ?, ?)
                """,
                batchArgs);
    }

    private PostMemorySourceRow mapPostMemorySourceRow(java.sql.ResultSet rs, int rowNum)
            throws java.sql.SQLException {
        return new PostMemorySourceRow(
                rs.getObject("post_id", UUID.class),
                rs.getObject("owner_id", UUID.class),
                rs.getString("title"),
                rs.getString("content"),
                rs.getObject("tag_id", UUID.class),
                rs.getString("tag_name"));
    }
}
