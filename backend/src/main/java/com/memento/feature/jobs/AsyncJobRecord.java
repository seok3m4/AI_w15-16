package com.memento.feature.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record AsyncJobRecord(
        UUID id,
        UUID ownerId,
        AsyncJobType type,
        AsyncJobStatus status,
        int progress,
        JsonNode input,
        JsonNode result,
        JsonNode error,
        boolean retryable,
        int attemptCount,
        int maxAttempts,
        Instant createdAt,
        Instant updatedAt,
        Instant startedAt,
        Instant completedAt) {
}
