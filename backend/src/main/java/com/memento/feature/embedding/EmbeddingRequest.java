package com.memento.feature.embedding;

import java.util.List;
import java.util.UUID;

record EmbeddingRequest(
        UUID requestId,
        UUID jobId,
        String idempotencyKey,
        String inputType,
        List<EmbeddingInputChunk> items) {

    EmbeddingRequest(
            UUID requestId,
            UUID jobId,
            String idempotencyKey,
            List<EmbeddingInputChunk> items) {
        this(requestId, jobId, idempotencyKey, "memory_chunk", items);
    }
}
