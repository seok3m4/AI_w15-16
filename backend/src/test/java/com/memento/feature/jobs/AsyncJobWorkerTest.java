package com.memento.feature.jobs;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Queue;
import java.util.UUID;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

class AsyncJobWorkerTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-06-16T09:30:00Z"), ZoneOffset.UTC);

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void runOnceClaimsSupportedJobAndMarksSuccess() {
        RecordingAsyncJobRepository repository = new RecordingAsyncJobRepository();
        UUID jobId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        repository.add(new ClaimedAsyncJob(
                jobId,
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                AsyncJobType.MEMORY_REINDEX,
                objectMapper.createObjectNode(),
                1,
                3));
        AsyncJobWorker worker = worker(repository, job -> objectMapper.createObjectNode().put("ok", true));

        int processed = worker.runOnce();

        assertThat(processed).isEqualTo(1);
        assertThat(repository.claimedSupportedTypes).containsExactly(AsyncJobType.MEMORY_REINDEX);
        assertThat(repository.succeededJobId).isEqualTo(jobId);
        assertThat(repository.successResult.path("ok").asBoolean()).isTrue();
    }

    @Test
    void runOnceMarksRetryableFailure() {
        RecordingAsyncJobRepository repository = new RecordingAsyncJobRepository();
        UUID jobId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        repository.add(new ClaimedAsyncJob(
                jobId,
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                AsyncJobType.MEMORY_REINDEX,
                objectMapper.createObjectNode(),
                1,
                3));
        AsyncJobWorker worker = worker(repository, job -> {
            throw new AsyncJobRetryableException("temporary provider failure");
        });

        int processed = worker.runOnce();

        assertThat(processed).isEqualTo(1);
        assertThat(repository.failedJobId).isEqualTo(jobId);
        assertThat(repository.failureError.retryable()).isTrue();
        assertThat(repository.failureError.message()).isEqualTo("temporary provider failure");
    }

    @Test
    void runOnceDoesNotClaimWhenNoHandlersAreRegistered() {
        RecordingAsyncJobRepository repository = new RecordingAsyncJobRepository();
        AsyncJobWorkerProperties properties = new AsyncJobWorkerProperties();
        AsyncJobWorker worker = new AsyncJobWorker(repository, properties, objectMapper, CLOCK, List.of());

        int processed = worker.runOnce();

        assertThat(processed).isZero();
        assertThat(repository.claimCalled).isFalse();
        assertThat(repository.recoverCalled).isTrue();
    }

    private AsyncJobWorker worker(
            RecordingAsyncJobRepository repository,
            Function<ClaimedAsyncJob, JsonNode> behavior) {
        AsyncJobWorkerProperties properties = new AsyncJobWorkerProperties();
        properties.setClaimLimit(2);
        AsyncJobHandler handler = new AsyncJobHandler() {
            @Override
            public AsyncJobType type() {
                return AsyncJobType.MEMORY_REINDEX;
            }

            @Override
            public JsonNode handle(ClaimedAsyncJob job) {
                return behavior.apply(job);
            }
        };
        return new AsyncJobWorker(repository, properties, objectMapper, CLOCK, List.of(handler));
    }

    private static final class RecordingAsyncJobRepository implements AsyncJobRepository {

        private final Queue<ClaimedAsyncJob> jobs = new ArrayDeque<>();
        private List<AsyncJobType> claimedSupportedTypes = List.of();
        private boolean claimCalled;
        private boolean recoverCalled;
        private UUID succeededJobId;
        private JsonNode successResult;
        private UUID failedJobId;
        private AsyncJobError failureError;

        void add(ClaimedAsyncJob job) {
            jobs.add(job);
        }

        @Override
        public AsyncJobRecord enqueue(
                UUID ownerId,
                AsyncJobType type,
                JsonNode input,
                boolean retryable,
                int maxAttempts,
                Instant now) {
            throw new UnsupportedOperationException();
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
            claimCalled = true;
            claimedSupportedTypes = List.copyOf(supportedTypes);
            return Optional.ofNullable(jobs.poll());
        }

        @Override
        public void markSucceeded(UUID jobId, JsonNode result, Instant now) {
            succeededJobId = jobId;
            successResult = result;
        }

        @Override
        public void markFailedOrRetry(UUID jobId, AsyncJobError error, Instant now) {
            failedJobId = jobId;
            failureError = error;
        }

        @Override
        public int recoverTimedOutJobs(Instant staleBefore, Instant now) {
            recoverCalled = true;
            return 0;
        }
    }
}
