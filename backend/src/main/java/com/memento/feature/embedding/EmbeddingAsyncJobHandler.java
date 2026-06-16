package com.memento.feature.embedding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.memento.feature.jobs.AsyncJobHandler;
import com.memento.feature.jobs.AsyncJobRetryableException;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.jobs.ClaimedAsyncJob;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.HttpServerErrorException;

@Component
class EmbeddingAsyncJobHandler implements AsyncJobHandler {

    private final MemoryEmbeddingRepository embeddingRepository;
    private final FastApiEmbeddingClient embeddingClient;
    private final PostMemoryStatusRepository postMemoryStatusRepository;
    private final ObjectMapper objectMapper;
    private final EmbeddingProperties properties;

    @Autowired
    EmbeddingAsyncJobHandler(
            MemoryEmbeddingRepository embeddingRepository,
            FastApiEmbeddingClient embeddingClient,
            PostMemoryStatusRepository postMemoryStatusRepository,
            ObjectMapper objectMapper,
            EmbeddingProperties properties) {
        this.embeddingRepository = embeddingRepository;
        this.embeddingClient = embeddingClient;
        this.postMemoryStatusRepository = postMemoryStatusRepository;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    EmbeddingAsyncJobHandler(
            MemoryEmbeddingRepository embeddingRepository,
            FastApiEmbeddingClient embeddingClient,
            PostMemoryStatusRepository postMemoryStatusRepository,
            ObjectMapper objectMapper) {
        this(embeddingRepository, embeddingClient, postMemoryStatusRepository, objectMapper, new EmbeddingProperties());
    }

    @Override
    public AsyncJobType type() {
        return AsyncJobType.MEMORY_REINDEX;
    }

    @Override
    public JsonNode handle(ClaimedAsyncJob job) {
        UUID ownerId = job.ownerId();
        UUID postId = parseUuid(job.input(), "postId");
        embeddingRepository.markRunningByJob(job.id());
        postMemoryStatusRepository.markRunning(postId, ownerId);

        List<EmbeddingInputChunk> inputs = embeddingRepository.findInputsByJob(job.id());
        if (inputs.isEmpty()) {
            String failureReason = "No active memory chunks were available for embedding.";
            markFailed(job.id(), postId, ownerId, failureReason);
            throw new IllegalStateException(failureReason);
        }

        try {
            EmbeddingResponse response = embeddingClient.createEmbeddings(new EmbeddingRequest(
                    UUID.randomUUID(),
                    job.id(),
                    "memory-reindex:" + job.id(),
                    inputs));
            validateResponse(inputs, response);
            embeddingRepository.saveSucceeded(job.id(), response);
            postMemoryStatusRepository.markSucceeded(postId, ownerId);
            return succeededResult(postId, response.embeddings().size());
        } catch (ResourceAccessException | HttpServerErrorException exception) {
            markFailed(job.id(), postId, ownerId, "Embedding provider is temporarily unavailable.");
            throw new AsyncJobRetryableException("Embedding provider is temporarily unavailable.");
        } catch (RestClientException exception) {
            markFailed(job.id(), postId, ownerId, "Embedding provider request failed.");
            throw exception;
        } catch (RuntimeException exception) {
            markFailed(job.id(), postId, ownerId, safeFailureReason(exception));
            throw exception;
        }
    }

    private void validateResponse(List<EmbeddingInputChunk> inputs, EmbeddingResponse response) {
        if (!properties.getProvider().equals(response.provider())) {
            throw new IllegalStateException("Embedding provider mismatch.");
        }
        if (!properties.getModel().equals(response.model())) {
            throw new IllegalStateException("Embedding model mismatch.");
        }
        if (response.dimension() != properties.getDimension()) {
            throw new IllegalStateException("Embedding dimension mismatch.");
        }
        Set<UUID> expectedChunkIds = new HashSet<>();
        for (EmbeddingInputChunk input : inputs) {
            expectedChunkIds.add(input.id());
        }
        Set<UUID> actualChunkIds = new HashSet<>();
        for (EmbeddingVectorResponse vector : response.embeddings()) {
            if (vector.vector() == null || vector.vector().size() != properties.getDimension()) {
                throw new IllegalStateException("Embedding vector dimension mismatch.");
            }
            actualChunkIds.add(vector.id());
        }
        if (!actualChunkIds.equals(expectedChunkIds)) {
            throw new IllegalStateException("Embedding response chunks did not match request chunks.");
        }
    }

    private UUID parseUuid(JsonNode input, String fieldName) {
        String value = input.path(fieldName).asText(null);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing embedding job field: " + fieldName);
        }
        return UUID.fromString(value);
    }

    private JsonNode succeededResult(UUID postId, int embeddingCount) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("postId", postId.toString());
        result.put("embeddingCount", embeddingCount);
        return result;
    }

    private void markFailed(UUID jobId, UUID postId, UUID ownerId, String failureReason) {
        embeddingRepository.markFailedByJob(jobId, failureReason);
        postMemoryStatusRepository.markFailed(postId, ownerId);
    }

    private String safeFailureReason(RuntimeException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return "Embedding job failed.";
        }
        return message.length() > 200 ? message.substring(0, 200) : message;
    }
}
