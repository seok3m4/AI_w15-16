package com.memento.feature.embedding;

import com.fasterxml.jackson.databind.JsonNode;
import com.memento.feature.jobs.AsyncJobRecord;
import java.util.UUID;

interface EmbeddingAsyncJobQueue {

    AsyncJobRecord enqueueMemoryReindex(UUID ownerId, JsonNode input, boolean retryable);
}
