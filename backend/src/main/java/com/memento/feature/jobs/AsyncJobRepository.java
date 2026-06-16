package com.memento.feature.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

interface AsyncJobRepository {

    AsyncJobRecord enqueue(
            UUID ownerId,
            AsyncJobType type,
            JsonNode input,
            boolean retryable,
            int maxAttempts,
            Instant now);

    Optional<AsyncJobRecord> findById(UUID jobId);

    Optional<AsyncJobRecord> findForOwner(UUID ownerId, UUID jobId);

    Optional<ClaimedAsyncJob> claimNext(Collection<AsyncJobType> supportedTypes, Instant now);

    void markSucceeded(UUID jobId, JsonNode result, Instant now);

    void markFailedOrRetry(UUID jobId, AsyncJobError error, Instant now);

    int recoverTimedOutJobs(Instant staleBefore, Instant now);
}
