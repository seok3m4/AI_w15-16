package com.memento.feature.embedding;

import com.fasterxml.jackson.databind.JsonNode;
import com.memento.feature.jobs.AsyncJobRecord;
import java.util.Optional;
import java.util.UUID;

interface EmbeddingAsyncJobQueue {

    Optional<AsyncJobRecord> findPendingMemoryReindex(UUID ownerId, UUID postId);

    AsyncJobRecord enqueueMemoryReindex(UUID ownerId, JsonNode input, boolean retryable);
}
