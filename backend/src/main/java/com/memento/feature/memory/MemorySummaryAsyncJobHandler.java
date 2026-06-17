package com.memento.feature.memory;

import com.fasterxml.jackson.databind.JsonNode;
import com.memento.feature.jobs.AsyncJobHandler;
import com.memento.feature.jobs.AsyncJobRetryableException;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.jobs.ClaimedAsyncJob;
import org.springframework.stereotype.Component;

@Component
class MemorySummaryAsyncJobHandler implements AsyncJobHandler {

    private final MemorySummaryService service;

    MemorySummaryAsyncJobHandler(MemorySummaryService service) {
        this.service = service;
    }

    @Override
    public AsyncJobType type() {
        return AsyncJobType.MEMORY_SUMMARIZE;
    }

    @Override
    public JsonNode handle(ClaimedAsyncJob job) {
        try {
            return service.handleJob(job);
        } catch (MemorySummaryTimeoutException exception) {
            throw new AsyncJobRetryableException("Memory summary provider is temporarily unavailable.");
        }
    }
}
