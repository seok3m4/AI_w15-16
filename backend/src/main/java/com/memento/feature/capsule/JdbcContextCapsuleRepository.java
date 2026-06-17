package com.memento.feature.capsule;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcContextCapsuleRepository implements ContextCapsuleRepository {

    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
    };

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    JdbcContextCapsuleRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public ContextCapsuleRecord save(NewContextCapsule capsule) {
        jdbcTemplate.update(
                """
                INSERT INTO context_capsules (
                    id,
                    owner_id,
                    title,
                    purpose,
                    query,
                    summary,
                    key_facts,
                    tags,
                    contains_friend_context
                )
                VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?)
                """,
                capsule.id(),
                capsule.ownerId(),
                capsule.title(),
                capsule.purpose(),
                capsule.query(),
                capsule.summary(),
                jsonb(capsule.keyFacts()),
                jsonb(capsule.tags()),
                capsule.containsFriendContext());

        for (ContextCapsuleSourceRecord source : capsule.sources()) {
            jdbcTemplate.update(
                    """
                    INSERT INTO context_capsule_sources (
                        capsule_id,
                        post_id,
                        chunk_id,
                        owner_user_id,
                        source_type
                    )
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    capsule.id(),
                    source.postId(),
                    source.chunkId(),
                    source.ownerUserId(),
                    source.sourceType());
        }
        return findActiveByOwner(capsule.ownerId(), capsule.id())
                .orElseThrow(() -> new IllegalStateException("Context capsule was not found after creation."));
    }

    @Override
    public List<ContextCapsuleRecord> findPageByOwner(UUID ownerId, int limit, int offset) {
        return jdbcTemplate.query(
                """
                SELECT
                    id,
                    owner_id,
                    title,
                    purpose,
                    query,
                    summary,
                    key_facts::text as key_facts,
                    tags::text as tags,
                    contains_friend_context,
                    created_at,
                    updated_at
                FROM context_capsules
                WHERE owner_id = ?
                  AND deleted_at IS NULL
                ORDER BY created_at DESC, id DESC
                LIMIT ?
                OFFSET ?
                """,
                this::mapCapsuleWithNoSources,
                ownerId,
                limit,
                offset);
    }

    @Override
    public long countByOwner(UUID ownerId) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT count(*)
                FROM context_capsules
                WHERE owner_id = ?
                  AND deleted_at IS NULL
                """,
                Long.class,
                ownerId);
        return count == null ? 0 : count;
    }

    @Override
    public Optional<ContextCapsuleRecord> findActiveByOwner(UUID ownerId, UUID capsuleId) {
        return findById(ownerId, capsuleId);
    }

    @Override
    public boolean updateByOwner(UUID capsuleId, UUID ownerId, String title, String purpose, Instant updatedAt) {
        int updatedRows = jdbcTemplate.update(
                """
                UPDATE context_capsules
                SET title = ?,
                    purpose = ?,
                    updated_at = ?
                WHERE id = ?
                  AND owner_id = ?
                  AND deleted_at IS NULL
                """,
                title,
                purpose,
                Timestamp.from(updatedAt),
                capsuleId,
                ownerId);
        return updatedRows > 0;
    }

    @Override
    public boolean softDeleteByOwner(UUID ownerId, UUID capsuleId, Instant deletedAt) {
        int updatedRows = jdbcTemplate.update(
                """
                UPDATE context_capsules
                SET deleted_at = ?,
                    updated_at = ?
                WHERE id = ?
                  AND owner_id = ?
                  AND deleted_at IS NULL
                """,
                Timestamp.from(deletedAt),
                Timestamp.from(deletedAt),
                capsuleId,
                ownerId);
        return updatedRows > 0;
    }

    private Optional<ContextCapsuleRecord> findById(UUID ownerId, UUID capsuleId) {
        ContextCapsuleRecord capsule;
        try {
            capsule = jdbcTemplate.queryForObject(
                    """
                    SELECT
                        id,
                        owner_id,
                        title,
                        purpose,
                        query,
                        summary,
                        key_facts::text as key_facts,
                        tags::text as tags,
                        contains_friend_context,
                        created_at,
                        updated_at
                    FROM context_capsules
                    WHERE owner_id = ?
                      AND id = ?
                      AND deleted_at IS NULL
                    """,
                    this::mapCapsuleWithNoSources,
                    ownerId,
                    capsuleId);
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }

        List<ContextCapsuleSourceRecord> sources = findSourcesByCapsuleId(capsuleId);
        return Optional.of(new ContextCapsuleRecord(
                capsule.id(),
                capsule.ownerId(),
                capsule.title(),
                capsule.purpose(),
                capsule.query(),
                capsule.summary(),
                capsule.keyFacts(),
                capsule.tags(),
                capsule.containsFriendContext(),
                sources,
                capsule.createdAt(),
                capsule.updatedAt()));
    }

    private ContextCapsuleRecord mapCapsuleWithNoSources(java.sql.ResultSet rs, int rowNum) throws SQLException {
        return new ContextCapsuleRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("owner_id", UUID.class),
                rs.getString("title"),
                rs.getString("purpose"),
                rs.getString("query"),
                rs.getString("summary"),
                stringList(rs.getString("key_facts")),
                stringList(rs.getString("tags")),
                rs.getBoolean("contains_friend_context"),
                List.of(),
                instant(rs, "created_at"),
                instant(rs, "updated_at"));
    }

    private List<ContextCapsuleSourceRecord> findSourcesByCapsuleId(UUID capsuleId) {
        return jdbcTemplate.query(
                """
                SELECT
                    s.post_id,
                    s.chunk_id,
                    s.owner_user_id,
                    u.nickname as owner_nickname,
                    p.title,
                    c.content as snippet,
                    s.source_type,
                    s.created_at
                FROM context_capsule_sources s
                JOIN posts p ON p.id = s.post_id
                JOIN users u ON u.id = s.owner_user_id
                LEFT JOIN memory_chunks c ON c.id = s.chunk_id
                WHERE s.capsule_id = ?
                ORDER BY s.created_at ASC
                """,
                this::sourceRow,
                capsuleId);
    }

    private ContextCapsuleSourceRecord sourceRow(ResultSet rs, int rowNum) throws SQLException {
        return new ContextCapsuleSourceRecord(
                rs.getObject("post_id", UUID.class),
                rs.getObject("chunk_id", UUID.class),
                rs.getObject("owner_user_id", UUID.class),
                rs.getString("owner_nickname"),
                rs.getString("title"),
                rs.getString("snippet"),
                rs.getString("source_type"),
                instant(rs, "created_at"));
    }

    private String jsonb(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values == null ? List.of() : values);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize context capsule json.", exception);
        }
    }

    private List<String> stringList(String json) {
        try {
            return objectMapper.readValue(json, STRING_LIST_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not deserialize context capsule json.", exception);
        }
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }
}

