package com.memento.feature.jobs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AsyncJobCommandServiceTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-06-16T09:30:00Z"), ZoneOffset.UTC);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RecordingAsyncJobRepository repository = new RecordingAsyncJobRepository();
    private final AsyncJobWorkerProperties properties = new AsyncJobWorkerProperties();
    private final AsyncJobCommandService service =
            new AsyncJobCommandService(repository, properties, objectMapper, CLOCK);

    @Test
    void enqueueUsesDefaultAttemptsAndEmptyInputWhenInputIsNull() {
        properties.setDefaultMaxAttempts(3);
        UUID ownerId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        AsyncJobRecord job = service.enqueue(ownerId, AsyncJobType.MEMORY_REINDEX, null, true);

        assertThat(job.ownerId()).isEqualTo(ownerId);
        assertThat(job.type()).isEqualTo(AsyncJobType.MEMORY_REINDEX);
        assertThat(job.status()).isEqualTo(AsyncJobStatus.PENDING);
        assertThat(job.retryable()).isTrue();
        assertThat(job.maxAttempts()).isEqualTo(3);
        assertThat(job.input().isObject()).isTrue();
        assertThat(job.createdAt()).isEqualTo(CLOCK.instant());
    }

    @Test
    void enqueueRejectsInvalidMaxAttempts() {
        UUID ownerId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        assertThatThrownBy(() -> service.enqueue(ownerId, AsyncJobType.MEMORY_REINDEX, null, true, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maxAttempts");
    }

    private final class RecordingAsyncJobRepository implements AsyncJobRepository {

        @Override
        public AsyncJobRecord enqueue(
                UUID ownerId,
                AsyncJobType type,
                com.fasterxml.jackson.databind.JsonNode input,
                boolean retryable,
                int maxAttempts,
                Instant now) {
            return new AsyncJobRecord(
                    UUID.fromString("22222222-2222-2222-2222-222222222222"),
                    ownerId,
                    type,
                    AsyncJobStatus.PENDING,
                    0,
                    input,
                    null,
                    null,
                    retryable,
                    0,
                    maxAttempts,
                    now,
                    now,
                    null,
                    null);
        }

        @Override
        public Optional<AsyncJobRecord> findById(UUID jobId) {
            return Optional.empty();
        }

        @Override
        public Optional<AsyncJobRecord> findForOwner(UUID ownerId, UUID jobId) {
            return Optional.empty();
        }

        @Override
        public Optional<ClaimedAsyncJob> claimNext(Collection<AsyncJobType> supportedTypes, Instant now) {
            return Optional.empty();
        }

        @Override
        public void markSucceeded(UUID jobId, com.fasterxml.jackson.databind.JsonNode result, Instant now) {
        }

        @Override
        public void markFailedOrRetry(UUID jobId, AsyncJobError error, Instant now) {
        }

        @Override
        public int recoverTimedOutJobs(Instant staleBefore, Instant now) {
            return 0;
        }
    }
}
