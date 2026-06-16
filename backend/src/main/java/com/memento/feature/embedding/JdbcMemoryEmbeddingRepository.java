package com.memento.feature.embedding;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcMemoryEmbeddingRepository implements MemoryEmbeddingRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcMemoryEmbeddingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void savePending(List<NewMemoryEmbedding> embeddings) {
        if (embeddings.isEmpty()) {
            return;
        }
        List<Object[]> batchArgs = embeddings.stream()
                .map(embedding -> new Object[] {
                    embedding.id(),
                    embedding.chunkId(),
                    embedding.provider(),
                    embedding.model(),
                    embedding.dimension(),
                    embedding.jobId()
                })
                .toList();
        jdbcTemplate.batchUpdate(
                """
                INSERT INTO memory_embeddings (
                    id, chunk_id, provider, model, dimension, embedding, status, job_id
                )
                VALUES (?, ?, ?, ?, ?, NULL, 'pending', ?)
                """,
                batchArgs);
    }

    @Override
    public void markRunningByJob(UUID jobId) {
        jdbcTemplate.update(
                """
                UPDATE memory_embeddings
                SET status = 'running',
                    embedding = NULL,
                    failure_reason = NULL,
                    updated_at = now()
                WHERE job_id = ?
                  AND status IN ('pending', 'failed')
                """,
                jobId);
    }

    @Override
    public List<EmbeddingInputChunk> findInputsByJob(UUID jobId) {
        return jdbcTemplate.query(
                """
                SELECT c.id, c.content
                FROM memory_embeddings e
                JOIN memory_chunks c ON c.id = e.chunk_id
                WHERE e.job_id = ?
                  AND e.status IN ('running', 'pending', 'failed')
                  AND c.status = 'active'
                ORDER BY c.created_at ASC, c.id ASC
                """,
                (rs, rowNum) -> new EmbeddingInputChunk(
                        rs.getObject("id", UUID.class),
                        rs.getString("content")),
                jobId);
    }

    @Override
    public void saveSucceeded(UUID jobId, EmbeddingResponse response) {
        if (response.embeddings().isEmpty()) {
            return;
        }
        List<Object[]> batchArgs = response.embeddings().stream()
                .map(embedding -> new Object[] {
                    response.provider(),
                    response.model(),
                    response.dimension(),
                    toVectorLiteral(embedding.vector()),
                    jobId,
                    embedding.id()
                })
                .toList();
        jdbcTemplate.batchUpdate(
                """
                UPDATE memory_embeddings
                SET provider = ?,
                    model = ?,
                    dimension = ?,
                    embedding = ?::vector,
                    status = 'succeeded',
                    failure_reason = NULL,
                    updated_at = now()
                WHERE job_id = ?
                  AND chunk_id = ?
                """,
                batchArgs);
    }

    @Override
    public void markFailedByJob(UUID jobId, String failureReason) {
        jdbcTemplate.update(
                """
                UPDATE memory_embeddings
                SET status = 'failed',
                    embedding = NULL,
                    failure_reason = ?,
                    updated_at = now()
                WHERE job_id = ?
                  AND status <> 'succeeded'
                """,
                failureReason,
                jobId);
    }

    private String toVectorLiteral(List<Double> vector) {
        return "[" + vector.stream()
                .map(String::valueOf)
                .reduce((left, right) -> left + "," + right)
                .orElse("") + "]";
    }
}
