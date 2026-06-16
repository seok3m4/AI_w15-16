package com.memento.feature.memory;

import com.fasterxml.jackson.databind.JsonNode;
import com.memento.feature.jobs.AsyncJobRecord;
import java.time.Instant;
import java.util.UUID;

record AsyncJobResponse(
        UUID id,
        String type,
        String status,
        int progress,
        boolean retryable,
        JsonNode result,
        JsonNode error,
        Instant createdAt,
        Instant updatedAt,
        Instant completedAt) {

    static AsyncJobResponse from(AsyncJobRecord job) {
        return new AsyncJobResponse(
                job.id(),
                job.type().value(),
                job.status().value(),
                job.progress(),
                job.retryable(),
                job.result(),
                job.error(),
                job.createdAt(),
                job.updatedAt(),
                job.completedAt());
    }
}
