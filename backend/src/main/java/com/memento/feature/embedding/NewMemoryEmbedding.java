package com.memento.feature.embedding;

import java.util.UUID;

record NewMemoryEmbedding(
        UUID id,
        UUID chunkId,
        String provider,
        String model,
        int dimension,
        UUID jobId) {
}
