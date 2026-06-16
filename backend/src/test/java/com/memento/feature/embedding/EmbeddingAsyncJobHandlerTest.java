package com.memento.feature.embedding;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.jobs.AsyncJobRetryableException;
import com.memento.feature.jobs.ClaimedAsyncJob;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

class EmbeddingAsyncJobHandlerTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER_OWNER_ID =
            UUID.fromString("99999999-9999-9999-9999-999999999999");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID JOB_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID CHUNK_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void handleCreatesEmbeddingsAndMarksRowsAndPostSucceeded() {
        RecordingMemoryEmbeddingRepository embeddingRepository = new RecordingMemoryEmbeddingRepository();
        embeddingRepository.inputs = List.of(new EmbeddingInputChunk(CHUNK_ID, "Memory chunk text"));
        RecordingFastApiEmbeddingClient embeddingClient = new RecordingFastApiEmbeddingClient();
        RecordingPostMemoryStatusRepository postStatusRepository = new RecordingPostMemoryStatusRepository();
        EmbeddingAsyncJobHandler handler = new EmbeddingAsyncJobHandler(
                embeddingRepository,
                embeddingClient,
                postStatusRepository,
                objectMapper);
        var input = objectMapper.createObjectNode()
                .put("ownerId", OWNER_ID.toString())
                .put("postId", POST_ID.toString());
        input.putArray("chunkIds").add(CHUNK_ID.toString());

        JsonNode result = handler.handle(new ClaimedAsyncJob(
                JOB_ID,
                OWNER_ID,
                AsyncJobType.MEMORY_REINDEX,
                input,
                1,
                3));

        assertThat(handler.type()).isEqualTo(AsyncJobType.MEMORY_REINDEX);
        assertThat(embeddingRepository.runningJobId).isEqualTo(JOB_ID);
        assertThat(postStatusRepository.transitions)
                .containsExactly("running:" + POST_ID, "succeeded:" + POST_ID);
        assertThat(embeddingClient.request.jobId()).isEqualTo(JOB_ID);
        assertThat(embeddingClient.request.idempotencyKey()).isEqualTo("memory-reindex:" + JOB_ID);
        assertThat(embeddingClient.request.items())
                .containsExactly(new EmbeddingInputChunk(CHUNK_ID, "Memory chunk text"));
        assertThat(embeddingRepository.succeededJobId).isEqualTo(JOB_ID);
        assertThat(embeddingRepository.succeededResponse.embeddings()).hasSize(1);
        assertThat(result.path("postId").asText()).isEqualTo(POST_ID.toString());
        assertThat(result.path("embeddingCount").asInt()).isEqualTo(1);
    }

    @Test
    void handleMarksEmbeddingAndPostFailedBeforeRetryableProviderFailure() {
        RecordingMemoryEmbeddingRepository embeddingRepository = new RecordingMemoryEmbeddingRepository();
        embeddingRepository.inputs = List.of(new EmbeddingInputChunk(CHUNK_ID, "Memory chunk text"));
        RecordingFastApiEmbeddingClient embeddingClient = new RecordingFastApiEmbeddingClient();
        embeddingClient.failure = new ResourceAccessException("Connection timed out");
        RecordingPostMemoryStatusRepository postStatusRepository = new RecordingPostMemoryStatusRepository();
        EmbeddingAsyncJobHandler handler = new EmbeddingAsyncJobHandler(
                embeddingRepository,
                embeddingClient,
                postStatusRepository,
                objectMapper);
        var input = objectMapper.createObjectNode()
                .put("ownerId", OWNER_ID.toString())
                .put("postId", POST_ID.toString());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> handler.handle(new ClaimedAsyncJob(
                        JOB_ID,
                        OWNER_ID,
                        AsyncJobType.MEMORY_REINDEX,
                        input,
                        1,
                        3)))
                .isInstanceOf(AsyncJobRetryableException.class)
                .hasMessage("Embedding provider is temporarily unavailable.");

        assertThat(embeddingRepository.failedJobId).isEqualTo(JOB_ID);
        assertThat(embeddingRepository.failureReason)
                .isEqualTo("Embedding provider is temporarily unavailable.");
        assertThat(postStatusRepository.transitions)
                .containsExactly("running:" + POST_ID, "failed:" + POST_ID);
    }

    @Test
    void handleFailsJobWhenNoActiveChunksCanBeEmbedded() {
        RecordingMemoryEmbeddingRepository embeddingRepository = new RecordingMemoryEmbeddingRepository();
        RecordingFastApiEmbeddingClient embeddingClient = new RecordingFastApiEmbeddingClient();
        RecordingPostMemoryStatusRepository postStatusRepository = new RecordingPostMemoryStatusRepository();
        EmbeddingAsyncJobHandler handler = new EmbeddingAsyncJobHandler(
                embeddingRepository,
                embeddingClient,
                postStatusRepository,
                objectMapper);
        var input = objectMapper.createObjectNode()
                .put("ownerId", OWNER_ID.toString())
                .put("postId", POST_ID.toString());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> handler.handle(new ClaimedAsyncJob(
                        JOB_ID,
                        OWNER_ID,
                        AsyncJobType.MEMORY_REINDEX,
                        input,
                        1,
                        3)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("No active memory chunks were available for embedding.");

        assertThat(embeddingClient.request).isNull();
        assertThat(embeddingRepository.failedJobId).isEqualTo(JOB_ID);
        assertThat(postStatusRepository.transitions)
                .containsExactly("running:" + POST_ID, "failed:" + POST_ID);
    }

    @Test
    void handleUsesClaimedJobOwnerForPostStatusEvenWhenInputOwnerDiffers() {
        RecordingMemoryEmbeddingRepository embeddingRepository = new RecordingMemoryEmbeddingRepository();
        embeddingRepository.inputs = List.of(new EmbeddingInputChunk(CHUNK_ID, "Memory chunk text"));
        RecordingFastApiEmbeddingClient embeddingClient = new RecordingFastApiEmbeddingClient();
        RecordingPostMemoryStatusRepository postStatusRepository = new RecordingPostMemoryStatusRepository();
        EmbeddingAsyncJobHandler handler = new EmbeddingAsyncJobHandler(
                embeddingRepository,
                embeddingClient,
                postStatusRepository,
                objectMapper);
        var input = objectMapper.createObjectNode()
                .put("ownerId", OTHER_OWNER_ID.toString())
                .put("postId", POST_ID.toString());

        handler.handle(new ClaimedAsyncJob(
                JOB_ID,
                OWNER_ID,
                AsyncJobType.MEMORY_REINDEX,
                input,
                1,
                3));

        assertThat(postStatusRepository.ownerIds)
                .containsExactly(OWNER_ID, OWNER_ID);
    }

    private static final class RecordingMemoryEmbeddingRepository implements MemoryEmbeddingRepository {

        private List<EmbeddingInputChunk> inputs = List.of();
        private UUID runningJobId;
        private List<NewMemoryEmbedding> saved = List.of();
        private UUID succeededJobId;
        private EmbeddingResponse succeededResponse;
        private UUID failedJobId;
        private String failureReason;

        @Override
        public void savePending(List<NewMemoryEmbedding> embeddings) {
            saved = List.copyOf(embeddings);
        }

        @Override
        public void markRunningByJob(UUID jobId) {
            runningJobId = jobId;
        }

        @Override
        public List<EmbeddingInputChunk> findInputsByJob(UUID jobId) {
            return inputs;
        }

        @Override
        public void saveSucceeded(UUID jobId, EmbeddingResponse response) {
            succeededJobId = jobId;
            succeededResponse = response;
        }

        @Override
        public void markFailedByJob(UUID jobId, String failureReason) {
            failedJobId = jobId;
            this.failureReason = failureReason;
        }
    }

    private static final class RecordingFastApiEmbeddingClient extends FastApiEmbeddingClient {

        private EmbeddingRequest request;
        private RuntimeException failure;

        RecordingFastApiEmbeddingClient() {
            super(null, new EmbeddingProperties());
        }

        @Override
        EmbeddingResponse createEmbeddings(EmbeddingRequest request) {
            this.request = request;
            if (failure != null) {
                throw failure;
            }
            return new EmbeddingResponse(
                    "mock",
                    "text-embedding-3-small",
                    1536,
                    List.of(new EmbeddingVectorResponse(
                            CHUNK_ID,
                            vector(1536),
                            new EmbeddingUsageResponse(3, 3))));
        }

        private static List<Double> vector(int dimension) {
            List<Double> values = new ArrayList<>();
            for (int i = 0; i < dimension; i++) {
                values.add(0.1d);
            }
            return values;
        }
    }

    private static final class RecordingPostMemoryStatusRepository implements PostMemoryStatusRepository {

        private final List<String> transitions = new ArrayList<>();
        private final List<UUID> ownerIds = new ArrayList<>();

        @Override
        public void markRunning(UUID postId, UUID ownerId) {
            transitions.add("running:" + postId);
            ownerIds.add(ownerId);
        }

        @Override
        public void markSucceeded(UUID postId, UUID ownerId) {
            transitions.add("succeeded:" + postId);
            ownerIds.add(ownerId);
        }

        @Override
        public void markFailed(UUID postId, UUID ownerId) {
            transitions.add("failed:" + postId);
            ownerIds.add(ownerId);
        }
    }
}
