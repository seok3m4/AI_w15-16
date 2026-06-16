package com.memento.feature.jobs;

public record AsyncJobError(String code, String message, boolean retryable) {

    public static AsyncJobError timeout() {
        return new AsyncJobError("JOB_TIMEOUT", "Async job timed out before completion.", true);
    }

    public static AsyncJobError failed(String message, boolean retryable) {
        String sanitizedMessage = message == null || message.isBlank()
                ? "Async job failed."
                : message;
        return new AsyncJobError("JOB_FAILED", sanitizedMessage, retryable);
    }
}
