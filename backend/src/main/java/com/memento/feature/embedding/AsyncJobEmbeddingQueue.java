package com.memento.feature.embedding;

import com.fasterxml.jackson.databind.JsonNode;
import com.memento.feature.jobs.AsyncJobCommandService;
import com.memento.feature.jobs.AsyncJobRecord;
import com.memento.feature.jobs.AsyncJobType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class AsyncJobEmbeddingQueue implements EmbeddingAsyncJobQueue {

    private final AsyncJobCommandService asyncJobCommandService;

    AsyncJobEmbeddingQueue(AsyncJobCommandService asyncJobCommandService) {
        this.asyncJobCommandService = asyncJobCommandService;
    }

    @Override
    public Optional<AsyncJobRecord> findPendingMemoryReindex(UUID ownerId, UUID postId) {
        return asyncJobCommandService.findPendingMemoryReindexForPost(ownerId, postId);
    }

    @Override
    public AsyncJobRecord enqueueMemoryReindex(UUID ownerId, JsonNode input, boolean retryable) {
        return asyncJobCommandService.enqueue(ownerId, AsyncJobType.MEMORY_REINDEX, input, retryable);
    }
}
