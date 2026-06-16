package com.memento.feature.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AsyncJobCommandService {

    private final AsyncJobRepository repository;
    private final AsyncJobWorkerProperties properties;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    AsyncJobCommandService(
            AsyncJobRepository repository,
            AsyncJobWorkerProperties properties,
            ObjectMapper objectMapper,
            Clock clock) {
        this.repository = repository;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional
    public AsyncJobRecord enqueue(UUID ownerId, AsyncJobType type, JsonNode input, boolean retryable) {
        return enqueue(ownerId, type, input, retryable, properties.getDefaultMaxAttempts());
    }

    @Transactional
    public AsyncJobRecord enqueue(
            UUID ownerId,
            AsyncJobType type,
            JsonNode input,
            boolean retryable,
            int maxAttempts) {
        if (maxAttempts < 1) {
            throw new IllegalArgumentException("maxAttempts must be at least 1.");
        }
        JsonNode safeInput = input == null ? objectMapper.createObjectNode() : input;
        return repository.enqueue(ownerId, type, safeInput, retryable, maxAttempts, clock.instant());
    }

    @Transactional(readOnly = true)
    public Optional<AsyncJobRecord> findById(UUID jobId) {
        return repository.findById(jobId);
    }

    @Transactional(readOnly = true)
    public Optional<AsyncJobRecord> findForOwner(UUID ownerId, UUID jobId) {
        return repository.findForOwner(ownerId, jobId);
    }
}
