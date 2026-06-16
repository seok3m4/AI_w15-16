package com.memento.feature.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;

public record ClaimedAsyncJob(
        UUID id,
        UUID ownerId,
        AsyncJobType type,
        JsonNode input,
        int attemptCount,
        int maxAttempts) {
}
