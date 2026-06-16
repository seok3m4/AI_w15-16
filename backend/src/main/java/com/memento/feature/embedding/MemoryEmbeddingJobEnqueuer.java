package com.memento.feature.embedding;

import com.memento.feature.jobs.AsyncJobRecord;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemoryEmbeddingJobEnqueuer {

    Optional<AsyncJobRecord> enqueueForChunks(
            UUID ownerId,
            UUID postId,
            List<EmbeddingInputChunk> chunks,
            String reason);
}
