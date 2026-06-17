package com.memento.feature.memory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.memento.feature.embedding.QueryEmbedding;
import com.memento.feature.embedding.QueryEmbeddingService;
import com.memento.feature.friend.FriendshipAccessService;
import com.memento.feature.jobs.AsyncJobCommandService;
import com.memento.feature.jobs.AsyncJobRecord;
import com.memento.feature.jobs.ClaimedAsyncJob;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.privacy.AiSharingConsentReader;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class FriendGiftRecommendationService {

    private static final String DEFAULT_OCCASION = "birthday";
    private static final int DEFAULT_MAX_SOURCES = 5;
    private static final int MAX_SOURCES = 20;

    private final FriendshipAccessService friendshipAccessService;
    private final AiSharingConsentReader aiSharingConsentReader;
    private final QueryEmbeddingService queryEmbeddingService;
    private final JdbcMemoryVectorSearchRepository vectorSearchRepository;
    private final FastApiFriendGiftRecommendationClient aiClient;
    private final AsyncJobCommandService asyncJobCommandService;
    private final ObjectMapper objectMapper;

    FriendGiftRecommendationService(
            FriendshipAccessService friendshipAccessService,
            AiSharingConsentReader aiSharingConsentReader,
            QueryEmbeddingService queryEmbeddingService,
            JdbcMemoryVectorSearchRepository vectorSearchRepository,
            FastApiFriendGiftRecommendationClient aiClient,
            AsyncJobCommandService asyncJobCommandService,
            ObjectMapper objectMapper) {
        this.friendshipAccessService = friendshipAccessService;
        this.aiSharingConsentReader = aiSharingConsentReader;
        this.queryEmbeddingService = queryEmbeddingService;
        this.vectorSearchRepository = vectorSearchRepository;
        this.aiClient = aiClient;
        this.asyncJobCommandService = asyncJobCommandService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    FriendGiftRecommendationResponse recommend(
            UUID requesterId,
            UUID friendId,
            FriendGiftRecommendationRequest request) {
        NormalizedGiftRecommendationRequest normalized = normalize(request);
        ensureAllowed(requesterId, friendId);
        List<MemoryVectorSearchCandidate> sources = findSources(requesterId, friendId, normalized);
        FastApiFriendGiftRecommendationResponse response = aiClient.recommend(toFastApiRequest(
                friendId,
                null,
                normalized,
                sources));
        return FriendGiftRecommendationResponse.from(friendId, normalized.occasion(), response);
    }

    @Transactional
    AsyncJobResponse enqueue(UUID requesterId, UUID friendId, FriendGiftRecommendationRequest request) {
        NormalizedGiftRecommendationRequest normalized = normalize(request);
        ensureAllowed(requesterId, friendId);
        AsyncJobRecord job = asyncJobCommandService.enqueue(
                requesterId,
                AsyncJobType.GIFT_RECOMMENDATION,
                jobInput(friendId, normalized),
                true);
        return AsyncJobResponse.from(job);
    }

    JsonNode handleJob(ClaimedAsyncJob job) {
        UUID friendId = UUID.fromString(job.input().path("friendId").asText());
        NormalizedGiftRecommendationRequest request = new NormalizedGiftRecommendationRequest(
                normalizeOccasion(job.input().path("occasion").asText(null)),
                null,
                normalizePreferences(job.input().path("preferences").asText(null)),
                normalizeMaxSources(job.input().path("maxSources").asInt(DEFAULT_MAX_SOURCES)));
        ensureAllowed(job.ownerId(), friendId);
        List<MemoryVectorSearchCandidate> sources = findSources(job.ownerId(), friendId, request);
        FastApiFriendGiftRecommendationResponse response = aiClient.recommend(toFastApiRequest(
                friendId,
                job.id(),
                request,
                sources));
        return objectMapper.valueToTree(FriendGiftRecommendationResponse.from(friendId, request.occasion(), response));
    }

    private void ensureAllowed(UUID requesterId, UUID friendId) {
        if (!friendshipAccessService.hasAcceptedFriendship(requesterId, friendId)
                || !aiSharingConsentReader.isFriendAiSharingEnabled(friendId)) {
            throw new FriendAiContextNotAllowedException();
        }
    }

    private List<MemoryVectorSearchCandidate> findSources(
            UUID requesterId,
            UUID friendId,
            NormalizedGiftRecommendationRequest request) {
        QueryEmbedding queryEmbedding;
        try {
            queryEmbedding = queryEmbeddingService.create(searchQuery(request));
        } catch (RuntimeException exception) {
            throw new MemorySearchEmbeddingFailedException(exception);
        }
        return vectorSearchRepository.searchFriend(
                requesterId,
                friendId,
                queryEmbedding.vector(),
                queryEmbedding.provider(),
                queryEmbedding.model(),
                queryEmbedding.dimension(),
                request.maxSources());
    }

    private FastApiFriendGiftRecommendationRequest toFastApiRequest(
            UUID friendId,
            UUID jobId,
            NormalizedGiftRecommendationRequest request,
            List<MemoryVectorSearchCandidate> sources) {
        return new FastApiFriendGiftRecommendationRequest(
                UUID.randomUUID().toString(),
                jobId,
                jobId == null ? "gift-recommendation:" + friendId + ":" + UUID.randomUUID() : "gift-recommendation:" + jobId,
                friendId,
                request.occasion(),
                request.budget(),
                request.preferences(),
                request.maxSources(),
                safeSources(sources).stream()
                        .limit(request.maxSources())
                        .map(FastApiGiftRecommendationInputSource::from)
                        .toList());
    }

    private ObjectNode jobInput(UUID friendId, NormalizedGiftRecommendationRequest request) {
        ObjectNode input = objectMapper.createObjectNode();
        input.put("friendId", friendId.toString());
        input.put("occasion", request.occasion());
        input.put("preferences", request.preferences());
        input.put("maxSources", request.maxSources());
        return input;
    }

    private String searchQuery(NormalizedGiftRecommendationRequest request) {
        return (request.occasion() + " gift " + request.preferences()).trim();
    }

    private NormalizedGiftRecommendationRequest normalize(FriendGiftRecommendationRequest request) {
        return new NormalizedGiftRecommendationRequest(
                normalizeOccasion(request.occasion()),
                request.budget(),
                normalizePreferences(request.preferences()),
                normalizeMaxSources(request.maxSources()));
    }

    private String normalizeOccasion(String occasion) {
        if (occasion == null || occasion.isBlank()) {
            return DEFAULT_OCCASION;
        }
        return occasion.trim();
    }

    private String normalizePreferences(String preferences) {
        if (preferences == null || preferences.isBlank()) {
            return "";
        }
        return preferences.trim();
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

    private List<MemoryVectorSearchCandidate> safeSources(List<MemoryVectorSearchCandidate> sources) {
        return sources == null ? List.of() : sources;
    }

    private record NormalizedGiftRecommendationRequest(
            String occasion,
            GiftBudgetRequest budget,
            String preferences,
            int maxSources) {
    }
}
