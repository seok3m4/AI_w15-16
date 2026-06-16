package com.memento.feature.jobs;

import java.util.Arrays;

public enum AsyncJobStatus {
    PENDING("pending"),
    RUNNING("running"),
    SUCCEEDED("succeeded"),
    FAILED("failed"),
    APPROVAL_REQUIRED("approval_required"),
    REJECTED("rejected");

    private final String value;

    AsyncJobStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    static AsyncJobStatus fromValue(String value) {
        return Arrays.stream(values())
                .filter(status -> status.value.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported async job status: " + value));
    }
}
