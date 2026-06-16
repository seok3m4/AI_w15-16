package com.memento.feature.embedding;

import java.util.List;
import java.util.UUID;

interface MemoryEmbeddingRepository {

    void savePending(List<NewMemoryEmbedding> embeddings);

    void markRunningByJob(UUID jobId);

    List<EmbeddingInputChunk> findInputsByJob(UUID jobId);

    void saveSucceeded(UUID jobId, EmbeddingResponse response);

    void markFailedByJob(UUID jobId, String failureReason);
}
