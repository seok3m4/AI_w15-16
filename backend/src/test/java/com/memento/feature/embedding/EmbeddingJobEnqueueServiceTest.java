package com.memento.feature.embedding;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.jobs.AsyncJobRecord;
import com.memento.feature.jobs.AsyncJobStatus;
import com.memento.feature.jobs.AsyncJobType;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EmbeddingJobEnqueueServiceTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID JOB_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID CHUNK_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID EMBEDDING_ID =
            UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final Instant NOW = Instant.parse("2026-06-16T09:30:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void enqueueForChunksCreatesRetryableMemoryReindexJobAndPendingEmbeddings() {
        RecordingAsyncJobRepository jobRepository = new RecordingAsyncJobRepository();
        RecordingMemoryEmbeddingRepository embeddingRepository = new RecordingMemoryEmbeddingRepository();
        EmbeddingProperties properties = new EmbeddingProperties();
        EmbeddingJobEnqueueService service = new EmbeddingJobEnqueueService(
                jobRepository,
                embeddingRepository,
                properties,
                () -> EMBEDDING_ID);

        Optional<AsyncJobRecord> job = service.enqueueForChunks(
                OWNER_ID,
                POST_ID,
                List.of(new EmbeddingInputChunk(CHUNK_ID, "Memory chunk text")),
                "post_created");

        assertThat(job).isPresent();
        assertThat(job.get().id()).isEqualTo(JOB_ID);
        assertThat(jobRepository.findPendingCalls).isEqualTo(1);
        assertThat(jobRepository.ownerId).isEqualTo(OWNER_ID);
        assertThat(jobRepository.type).isEqualTo(AsyncJobType.MEMORY_REINDEX);
        assertThat(jobRepository.retryable).isTrue();
        assertThat(jobRepository.input.path("ownerId").asText()).isEqualTo(OWNER_ID.toString());
        assertThat(jobRepository.input.path("postId").asText()).isEqualTo(POST_ID.toString());
        assertThat(jobRepository.input.path("reason").asText()).isEqualTo("post_created");

        assertThat(embeddingRepository.saved)
                .containsExactly(new NewMemoryEmbedding(
                        EMBEDDING_ID,
                        CHUNK_ID,
                        "mock",
                        "text-embedding-3-small",
                        1536,
                        JOB_ID));
    }

    @Test
    void enqueueForChunksReusesPendingMemoryReindexJobForSamePost() {
        RecordingAsyncJobRepository jobRepository = new RecordingAsyncJobRepository();
        jobRepository.pendingJob = jobRecord(JOB_ID, pendingInput());
        RecordingMemoryEmbeddingRepository embeddingRepository = new RecordingMemoryEmbeddingRepository();
        EmbeddingJobEnqueueService service = new EmbeddingJobEnqueueService(
                jobRepository,
                embeddingRepository,
                new EmbeddingProperties(),
                () -> EMBEDDING_ID);

        Optional<AsyncJobRecord> job = service.enqueueForChunks(
                OWNER_ID,
                POST_ID,
                List.of(new EmbeddingInputChunk(CHUNK_ID, "Memory chunk text")),
                "post_updated");

        assertThat(job).contains(jobRepository.pendingJob);
        assertThat(jobRepository.enqueueCalled).isFalse();
        assertThat(embeddingRepository.saved)
                .containsExactly(new NewMemoryEmbedding(
                        EMBEDDING_ID,
                        CHUNK_ID,
                        "mock",
                        "text-embedding-3-small",
                        1536,
                        JOB_ID));
    }

    @Test
    void enqueueForChunksSkipsJobWhenThereAreNoChunks() {
        RecordingAsyncJobRepository jobRepository = new RecordingAsyncJobRepository();
        RecordingMemoryEmbeddingRepository embeddingRepository = new RecordingMemoryEmbeddingRepository();
        EmbeddingJobEnqueueService service = new EmbeddingJobEnqueueService(
                jobRepository,
                embeddingRepository,
                new EmbeddingProperties(),
                () -> EMBEDDING_ID);

        Optional<AsyncJobRecord> job = service.enqueueForChunks(OWNER_ID, POST_ID, List.of(), "post_created");

        assertThat(job).isEmpty();
        assertThat(jobRepository.enqueueCalled).isFalse();
        assertThat(embeddingRepository.saved).isEmpty();
    }

    private AsyncJobRecord jobRecord(UUID jobId, JsonNode input) {
        return new AsyncJobRecord(
                jobId,
                OWNER_ID,
                AsyncJobType.MEMORY_REINDEX,
                AsyncJobStatus.PENDING,
                0,
                input,
                null,
                null,
                true,
                0,
                3,
                CLOCK.instant(),
                CLOCK.instant(),
                null,
                null);
    }

    private JsonNode pendingInput() {
        return objectMapper.createObjectNode()
                .put("ownerId", OWNER_ID.toString())
                .put("postId", POST_ID.toString())
                .put("reason", "post_created");
    }

    private final class RecordingAsyncJobRepository implements EmbeddingAsyncJobQueue {

        private boolean enqueueCalled;
        private int findPendingCalls;
        private UUID ownerId;
        private AsyncJobType type;
        private JsonNode input;
        private boolean retryable;
        private AsyncJobRecord pendingJob;

        @Override
        public Optional<AsyncJobRecord> findPendingMemoryReindex(UUID ownerId, UUID postId) {
            findPendingCalls++;
            assertThat(ownerId).isEqualTo(OWNER_ID);
            assertThat(postId).isEqualTo(POST_ID);
            return Optional.ofNullable(pendingJob);
        }

        @Override
        public AsyncJobRecord enqueueMemoryReindex(
                UUID ownerId,
                JsonNode input,
                boolean retryable) {
            enqueueCalled = true;
            this.ownerId = ownerId;
            this.type = AsyncJobType.MEMORY_REINDEX;
            this.input = input;
            this.retryable = retryable;
            return jobRecord(JOB_ID, input);
        }
    }

    private static final class RecordingMemoryEmbeddingRepository implements MemoryEmbeddingRepository {

        private List<NewMemoryEmbedding> saved = List.of();

        @Override
        public void savePending(List<NewMemoryEmbedding> embeddings) {
            saved = List.copyOf(embeddings);
        }

        @Override
        public void markRunningByJob(UUID jobId) {
        }

        @Override
        public List<EmbeddingInputChunk> findInputsByJob(UUID jobId) {
            return List.of();
        }

        @Override
        public void saveSucceeded(UUID jobId, EmbeddingResponse response) {
        }

        @Override
        public void markFailedByJob(UUID jobId, String failureReason) {
        }
    }
}
