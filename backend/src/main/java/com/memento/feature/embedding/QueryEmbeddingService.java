package com.memento.feature.embedding;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class QueryEmbeddingService {

    private static final String INPUT_TYPE_QUERY = "query";

    private final FastApiEmbeddingClient embeddingClient;
    private final EmbeddingProperties properties;
    private final Supplier<UUID> uuidSupplier;

    @Autowired
    public QueryEmbeddingService(FastApiEmbeddingClient embeddingClient, EmbeddingProperties properties) {
        this(embeddingClient, properties, UUID::randomUUID);
    }

    QueryEmbeddingService(
            FastApiEmbeddingClient embeddingClient,
            EmbeddingProperties properties,
            Supplier<UUID> uuidSupplier) {
        this.embeddingClient = embeddingClient;
        this.properties = properties;
        this.uuidSupplier = uuidSupplier;
    }

    public QueryEmbedding create(String query) {
        UUID requestId = uuidSupplier.get();
        EmbeddingInputChunk queryInput = new EmbeddingInputChunk(requestId, query);
        EmbeddingResponse response = embeddingClient.createEmbeddings(new EmbeddingRequest(
                requestId,
                null,
                "memory-search:" + requestId,
                INPUT_TYPE_QUERY,
                List.of(queryInput)));
        validateResponse(queryInput.id(), response);
        return new QueryEmbedding(
                response.provider(),
                response.model(),
                response.dimension(),
                response.embeddings().get(0).vector());
    }

    private void validateResponse(UUID expectedId, EmbeddingResponse response) {
        if (!properties.getProvider().equals(response.provider())) {
            throw new IllegalStateException("Embedding provider mismatch.");
        }
        if (!properties.getModel().equals(response.model())) {
            throw new IllegalStateException("Embedding model mismatch.");
        }
        if (response.dimension() != properties.getDimension()) {
            throw new IllegalStateException("Embedding dimension mismatch.");
        }
        if (response.embeddings() == null || response.embeddings().size() != 1) {
            throw new IllegalStateException("Embedding response must contain one query vector.");
        }
        EmbeddingVectorResponse vector = response.embeddings().get(0);
        if (!expectedId.equals(vector.id())) {
            throw new IllegalStateException("Embedding response query id did not match request.");
        }
        if (vector.vector() == null || vector.vector().size() != properties.getDimension()) {
            throw new IllegalStateException("Embedding vector dimension mismatch.");
        }
    }
}
