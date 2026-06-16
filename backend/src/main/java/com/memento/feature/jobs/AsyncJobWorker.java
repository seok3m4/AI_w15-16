package com.memento.feature.jobs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "memento.jobs.worker", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AsyncJobWorker {

    private final AsyncJobRepository repository;
    private final AsyncJobWorkerProperties properties;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final Map<AsyncJobType, AsyncJobHandler> handlers;

    AsyncJobWorker(
            AsyncJobRepository repository,
            AsyncJobWorkerProperties properties,
            ObjectMapper objectMapper,
            Clock clock,
            List<AsyncJobHandler> handlers) {
        this.repository = repository;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.handlers = handlers.stream()
                .collect(Collectors.toUnmodifiableMap(AsyncJobHandler::type, Function.identity()));
    }

    @Scheduled(fixedDelayString = "#{@asyncJobWorkerProperties.pollInterval.toMillis()}")
    public void runScheduled() {
        runOnce();
    }

    public int runOnce() {
        repository.recoverTimedOutJobs(clock.instant().minus(properties.getStaleTimeout()), clock.instant());

        Collection<AsyncJobType> supportedTypes = handlers.keySet();
        if (supportedTypes.isEmpty()) {
            return 0;
        }

        int processed = 0;
        for (int i = 0; i < properties.getClaimLimit(); i++) {
            var claimedJob = repository.claimNext(supportedTypes, clock.instant());
            if (claimedJob.isEmpty()) {
                break;
            }
            process(claimedJob.get());
            processed++;
        }
        return processed;
    }

    private void process(ClaimedAsyncJob job) {
        AsyncJobHandler handler = handlers.get(job.type());
        try {
            JsonNode result = handler.handle(job);
            repository.markSucceeded(job.id(), result == null ? objectMapper.createObjectNode() : result, clock.instant());
        } catch (AsyncJobRetryableException exception) {
            repository.markFailedOrRetry(
                    job.id(),
                    AsyncJobError.failed(exception.getMessage(), true),
                    clock.instant());
        } catch (RuntimeException exception) {
            repository.markFailedOrRetry(
                    job.id(),
                    AsyncJobError.failed(exception.getMessage(), false),
                    clock.instant());
        }
    }
}
