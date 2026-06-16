package com.memento.feature.embedding;

import java.util.List;

interface MemoryEmbeddingRepository {

    void savePending(List<NewMemoryEmbedding> embeddings);
}
