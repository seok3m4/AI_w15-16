package com.memento.feature.memory;

class MemorySummaryProviderException extends RuntimeException {

    MemorySummaryProviderException() {
        super("Memory summary provider request failed.");
    }

    MemorySummaryProviderException(Throwable cause) {
        super("Memory summary provider request failed.", cause);
    }
}
