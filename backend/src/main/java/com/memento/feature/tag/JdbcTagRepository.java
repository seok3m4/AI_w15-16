package com.memento.feature.tag;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcTagRepository implements TagRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcTagRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<TagRecord> findPageByOwner(UUID ownerId, int limit, int offset) {
        return jdbcTemplate.query(
                """
                SELECT
                    t.id,
                    t.name,
                    count(p.id)::integer AS post_count
                FROM tags t
                LEFT JOIN post_tags pt ON pt.tag_id = t.id
                LEFT JOIN posts p ON p.id = pt.post_id
                    AND p.author_id = t.owner_id
                    AND p.deleted_at IS NULL
                WHERE t.owner_id = ?
                GROUP BY t.id, t.name
                ORDER BY t.name ASC, t.id ASC
                LIMIT ?
                OFFSET ?
                """,
                (rs, rowNum) -> new TagRecord(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getInt("post_count")),
                ownerId,
                limit,
                offset);
    }

    @Override
    public long countByOwner(UUID ownerId) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT count(*)
                FROM tags t
                WHERE t.owner_id = ?
                """,
                Long.class,
                ownerId);
        return count == null ? 0 : count;
    }
}
