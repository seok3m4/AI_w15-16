package com.memento.feature.jobs;

import java.util.Arrays;

public enum AsyncJobType {
    MEMORY_REINDEX("memory_reindex"),
    MEMORY_SUMMARIZE("memory_summarize"),
    GIFT_RECOMMENDATION("gift_recommendation"),
    AGENT_TASK("agent_task");

    private final String value;

    AsyncJobType(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    static AsyncJobType fromValue(String value) {
        return Arrays.stream(values())
                .filter(type -> type.value.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported async job type: " + value));
    }
}
