package com.memento.feature.embedding;

import java.util.List;
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
}
