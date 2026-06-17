package com.memento.feature.memory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.memento.feature.jobs.AsyncJobCommandService;
import com.memento.feature.jobs.AsyncJobRecord;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.jobs.ClaimedAsyncJob;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MemorySummaryService {

    private static final String SCOPE_ME = "me";
    private static final int DEFAULT_MAX_SOURCES = 5;
    private static final int MAX_SOURCES = 20;

    private final MemorySummarySourceReader sourceReader;
    private final FastApiMemorySummaryClient summaryClient;
    private final AsyncJobCommandService asyncJobCommandService;
    private final ObjectMapper objectMapper;

    MemorySummaryService(
            MemorySummarySourceReader sourceReader,
            FastApiMemorySummaryClient summaryClient,
            AsyncJobCommandService asyncJobCommandService,
            ObjectMapper objectMapper) {
        this.sourceReader = sourceReader;
        this.summaryClient = summaryClient;
        this.asyncJobCommandService = asyncJobCommandService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    MemorySummaryResponse summarize(UUID ownerId, MemorySummaryRequest request) {
        NormalizedMemorySummaryRequest normalized = normalize(request);
        List<MemorySummarySource> sources = findVerifiedSources(ownerId, normalized.sourcePostIds());
        return callSummaryProvider(ownerId, null, normalized, sources);
    }

    @Transactional
    AsyncJobResponse enqueue(UUID ownerId, MemorySummaryRequest request) {
        NormalizedMemorySummaryRequest normalized = normalize(request);
        findVerifiedSources(ownerId, normalized.sourcePostIds());
        AsyncJobRecord job = asyncJobCommandService.enqueue(
                ownerId,
                AsyncJobType.MEMORY_SUMMARIZE,
                jobInput(normalized),
                true);
        return AsyncJobResponse.from(job);
    }

    JsonNode handleJob(ClaimedAsyncJob job) {
        NormalizedMemorySummaryRequest request = normalizeJobInput(job.input());
        List<MemorySummarySource> sources = findVerifiedSources(job.ownerId(), request.sourcePostIds());
        MemorySummaryResponse response = callSummaryProvider(job.ownerId(), job.id(), request, sources);
        return objectMapper.valueToTree(response);
    }

    private MemorySummaryResponse callSummaryProvider(
            UUID ownerId,
            UUID jobId,
            NormalizedMemorySummaryRequest request,
            List<MemorySummarySource> sources) {
        FastApiMemorySummaryRequest fastApiRequest = new FastApiMemorySummaryRequest(
                UUID.randomUUID().toString(),
                jobId,
                jobId == null ? "memory-summary:" + ownerId + ":" + UUID.randomUUID() : "memory-summary:" + jobId,
                request.query(),
                request.scope(),
                request.maxSources(),
                sources.stream()
                        .limit(request.maxSources())
                        .map(FastApiMemorySummarySource::from)
                        .toList());
        return summaryClient.summarize(fastApiRequest).toApiResponse();
    }

    private List<MemorySummarySource> findVerifiedSources(UUID ownerId, List<UUID> postIds) {
        if (postIds.isEmpty()) {
            throw new MemorySearchRequestInvalidException("sourcePostIds must not be empty.");
        }
        List<MemorySummarySource> sources = sourceReader.findSourcesForOwnerPostIds(ownerId, postIds);
        if (sources.size() != postIds.size()) {
            throw new PostNotFoundForMemoryStatusException(null);
        }
        return sources;
    }

    private NormalizedMemorySummaryRequest normalize(MemorySummaryRequest request) {
        String query = normalizeQuery(request.query());
        String scope = normalizeScope(request.scope());
        int maxSources = normalizeMaxSources(request.maxSources());
        List<UUID> sourcePostIds = normalizeSourcePostIds(request.sourcePostIds(), maxSources);
        return new NormalizedMemorySummaryRequest(query, scope, sourcePostIds, maxSources);
    }

    private NormalizedMemorySummaryRequest normalizeJobInput(JsonNode input) {
        String query = normalizeQuery(input.path("query").asText(null));
        String scope = normalizeScope(input.path("scope").asText(null));
        int maxSources = normalizeMaxSources(input.path("maxSources").isMissingNode()
                ? null
                : input.path("maxSources").asInt());
        List<UUID> sourcePostIds = new java.util.ArrayList<>();
        input.path("sourcePostIds").forEach(node -> sourcePostIds.add(UUID.fromString(node.asText())));
        return new NormalizedMemorySummaryRequest(query, scope, sourcePostIds, maxSources);
    }

    private ObjectNode jobInput(NormalizedMemorySummaryRequest request) {
        ObjectNode input = objectMapper.createObjectNode();
        input.put("query", request.query());
        input.put("scope", request.scope());
        input.put("maxSources", request.maxSources());
        ArrayNode sourcePostIds = input.putArray("sourcePostIds");
        request.sourcePostIds().forEach(postId -> sourcePostIds.add(postId.toString()));
        return input;
    }

    private String normalizeQuery(String query) {
        if (query == null || query.isBlank()) {
            throw new MemorySearchRequestInvalidException("query must not be blank.");
        }
        return query.trim();
    }

    private String normalizeScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return SCOPE_ME;
        }
        String normalized = scope.trim();
        if (!SCOPE_ME.equals(normalized)) {
            throw new MemorySearchRequestInvalidException("scope must be me for P2 memory summary.");
        }
        return normalized;
    }

    private int normalizeMaxSources(Integer maxSources) {
        if (maxSources == null) {
            return DEFAULT_MAX_SOURCES;
        }
        if (maxSources < 1 || maxSources > MAX_SOURCES) {
            throw new MemorySearchRequestInvalidException("maxSources must be between 1 and 20.");
        }
        return maxSources;
    }

    private List<UUID> normalizeSourcePostIds(List<UUID> sourcePostIds, int maxSources) {
        if (sourcePostIds == null) {
            return List.of();
        }
        List<UUID> normalized = new LinkedHashSet<>(sourcePostIds).stream().toList();
        if (normalized.size() > MAX_SOURCES) {
            throw new MemorySearchRequestInvalidException("sourcePostIds must contain at most 20 posts.");
        }
        return normalized.stream()
                .limit(maxSources)
                .toList();
    }

    private record NormalizedMemorySummaryRequest(
            String query,
            String scope,
            List<UUID> sourcePostIds,
            int maxSources) {
    }
}
