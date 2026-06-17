package com.memento.feature.memory;

class MemorySummaryTimeoutException extends RuntimeException {

    MemorySummaryTimeoutException(Throwable cause) {
        super("Memory summary provider timed out.", cause);
    }
}
