package com.memento.feature.jobs;

public class AsyncJobRetryableException extends RuntimeException {

    public AsyncJobRetryableException(String message) {
        super(message);
    }
}
