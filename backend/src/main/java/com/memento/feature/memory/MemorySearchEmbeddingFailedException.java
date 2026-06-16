package com.memento.feature.memory;

class MemorySearchEmbeddingFailedException extends RuntimeException {

    MemorySearchEmbeddingFailedException(Throwable cause) {
        super("Embedding provider is temporarily unavailable.", cause);
    }
}
