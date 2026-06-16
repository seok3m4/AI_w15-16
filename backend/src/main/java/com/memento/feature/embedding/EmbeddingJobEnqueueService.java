package com.memento.feature.embedding;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.memento.feature.jobs.AsyncJobRecord;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class EmbeddingJobEnqueueService implements MemoryEmbeddingJobEnqueuer {

    private final EmbeddingAsyncJobQueue asyncJobQueue;
    private final MemoryEmbeddingRepository embeddingRepository;
    private final EmbeddingProperties properties;
    private final ObjectMapper objectMapper;
    private final Supplier<UUID> idSupplier;

    @Autowired
    EmbeddingJobEnqueueService(
            EmbeddingAsyncJobQueue asyncJobQueue,
            MemoryEmbeddingRepository embeddingRepository,
            EmbeddingProperties properties,
            ObjectMapper objectMapper) {
        this(asyncJobQueue, embeddingRepository, properties, objectMapper, UUID::randomUUID);
    }

    EmbeddingJobEnqueueService(
            EmbeddingAsyncJobQueue asyncJobQueue,
            MemoryEmbeddingRepository embeddingRepository,
            EmbeddingProperties properties,
            Supplier<UUID> idSupplier) {
        this(asyncJobQueue, embeddingRepository, properties, new ObjectMapper(), idSupplier);
    }

    EmbeddingJobEnqueueService(
            EmbeddingAsyncJobQueue asyncJobQueue,
            MemoryEmbeddingRepository embeddingRepository,
            EmbeddingProperties properties,
            ObjectMapper objectMapper,
            Supplier<UUID> idSupplier) {
        this.asyncJobQueue = asyncJobQueue;
        this.embeddingRepository = embeddingRepository;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.idSupplier = idSupplier;
    }

    @Override
    @Transactional
    public Optional<AsyncJobRecord> enqueueForChunks(
            UUID ownerId,
            UUID postId,
            List<EmbeddingInputChunk> chunks,
            String reason) {
        if (chunks.isEmpty()) {
            return Optional.empty();
        }

        AsyncJobRecord job = asyncJobQueue.findPendingMemoryReindex(ownerId, postId)
                .orElseGet(() -> createPendingReindexJob(ownerId, postId, reason));

        List<NewMemoryEmbedding> pendingEmbeddings = new ArrayList<>();
        ObjectNode input = objectMapper.createObjectNode()
                .put("ownerId", ownerId.toString())
                .put("postId", postId.toString())
                .put("reason", reason);
        ArrayNode chunkIds = input.putArray("chunkIds");
        ArrayNode embeddingIds = input.putArray("embeddingIds");

        for (EmbeddingInputChunk chunk : chunks) {
            UUID embeddingId = idSupplier.get();
            chunkIds.add(chunk.id().toString());
            embeddingIds.add(embeddingId.toString());
            pendingEmbeddings.add(new NewMemoryEmbedding(
                    embeddingId,
                    chunk.id(),
                    properties.getProvider(),
                    properties.getModel(),
                    properties.getDimension(),
                    null));
        }

        List<NewMemoryEmbedding> embeddingsWithJob = pendingEmbeddings.stream()
                .map(embedding -> new NewMemoryEmbedding(
                        embedding.id(),
                        embedding.chunkId(),
                        embedding.provider(),
                        embedding.model(),
                        embedding.dimension(),
                        job.id()))
                .toList();
        embeddingRepository.savePending(embeddingsWithJob);
        return Optional.of(job);
    }

    private AsyncJobRecord createPendingReindexJob(
            UUID ownerId,
            UUID postId,
            String reason) {
        ObjectNode input = objectMapper.createObjectNode()
                .put("ownerId", ownerId.toString())
                .put("postId", postId.toString())
                .put("reason", reason);
        return asyncJobQueue.enqueueMemoryReindex(ownerId, input, true);
    }
}
