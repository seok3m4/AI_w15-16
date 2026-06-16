package com.memento.feature.memory;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
class JdbcMemoryVectorSearchRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcMemoryVectorSearchRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<MemoryVectorSearchCandidate> searchMe(
            UUID ownerId,
            List<Double> embedding,
            String provider,
            String model,
            int dimension,
            int limit) {
        String embeddingLiteral = "["
                + embedding.stream().map(String::valueOf).reduce((left, right) -> left + "," + right).orElse("")
                + "]";

        return jdbcTemplate.query(
                """
                SELECT
                    p.id as post_id,
                    c.id as chunk_id,
                    c.owner_id,
                    p.title,
                    c.content as snippet,
                    c.source_kind as source_kind,
                    e.embedding <=> ?::vector as score,
                    c.created_at
                FROM memory_embeddings e
                JOIN memory_chunks c ON c.id = e.chunk_id
                JOIN posts p ON p.id = c.post_id
                WHERE c.owner_id = ?
                  AND c.status = 'active'
                  AND p.deleted_at IS NULL
                  AND e.status = 'succeeded'
                  AND e.provider = ?
                  AND e.model = ?
                  AND e.dimension = ?
                ORDER BY score ASC
                LIMIT ?
                """,
                rowMapper(),
                embeddingLiteral,
                ownerId,
                provider,
                model,
                dimension,
                limit);
    }

    private RowMapper<MemoryVectorSearchCandidate> rowMapper() {
        return (ResultSet rs, int rowNum) -> new MemoryVectorSearchCandidate(
                rs.getObject("post_id", UUID.class),
                rs.getObject("chunk_id", UUID.class),
                rs.getObject("owner_id", UUID.class),
                rs.getString("title"),
                rs.getString("snippet"),
                MemorySourceKind.fromDatabaseValue(rs.getString("source_kind")),
                rs.getDouble("score"),
                instant(rs, "created_at"));
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }
}
