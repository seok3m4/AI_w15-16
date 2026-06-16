package com.memento.feature.embedding;

import java.util.List;
import java.util.UUID;

record EmbeddingResponse(
        String provider,
        String model,
        int dimension,
        List<EmbeddingVectorResponse> embeddings) {
}

record EmbeddingVectorResponse(
        UUID id,
        List<Double> vector,
        EmbeddingUsageResponse usage) {
}

record EmbeddingUsageResponse(
        Integer promptTokens,
        Integer totalTokens) {
}
