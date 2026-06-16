package com.memento.feature.memory;

import com.memento.feature.embedding.EmbeddingInputChunk;
import com.memento.feature.embedding.MemoryEmbeddingJobEnqueuer;
import com.memento.feature.embedding.QueryEmbedding;
import com.memento.feature.embedding.QueryEmbeddingService;
import com.memento.feature.jobs.AsyncJobCommandService;
import com.memento.feature.jobs.AsyncJobRecord;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

@Service
class PostMemoryFeatureService {

    private static final String DEFAULT_MANUAL_RETRY_REASON = "manual_retry";
    private static final String SCOPE_ME = "me";
    private static final int DEFAULT_MEMORY_SEARCH_LIMIT = 10;

    private final PostMemoryStatusRepository postMemoryStatusRepository;
    private final MemoryEmbeddingJobEnqueuer memoryEmbeddingJobEnqueuer;
    private final AsyncJobCommandService asyncJobCommandService;
    private final JdbcMemoryVectorSearchRepository memoryVectorSearchRepository;
    private final QueryEmbeddingService queryEmbeddingService;

    PostMemoryFeatureService(
            PostMemoryStatusRepository postMemoryStatusRepository,
            MemoryEmbeddingJobEnqueuer memoryEmbeddingJobEnqueuer,
            AsyncJobCommandService asyncJobCommandService,
            JdbcMemoryVectorSearchRepository memoryVectorSearchRepository,
            QueryEmbeddingService queryEmbeddingService) {
        this.postMemoryStatusRepository = postMemoryStatusRepository;
        this.memoryEmbeddingJobEnqueuer = memoryEmbeddingJobEnqueuer;
        this.asyncJobCommandService = asyncJobCommandService;
        this.memoryVectorSearchRepository = memoryVectorSearchRepository;
        this.queryEmbeddingService = queryEmbeddingService;
    }

    @Transactional(readOnly = true)
    PostMemoryStatusResponse getPostMemoryStatus(UUID ownerId, UUID postId) {
        return postMemoryStatusRepository.findForOwnerAndPost(ownerId, postId)
                .map(PostMemoryStatusResponse::from)
                .orElseThrow(() -> new PostNotFoundForMemoryStatusException(postId));
    }

    @Transactional
    AsyncJobResponse reindexPosts(UUID ownerId, ReindexMemoriesRequest request) {
        List<UUID> postIds = normalizePostIds(request.postIds());

        if (CollectionUtils.isEmpty(postIds)) {
            throw new ReindexRequestInvalidException("postIds must not be empty.");
        }

        AsyncJobRecord selectedJob = null;
        String reason = normalizeReason(request.reason());

        for (UUID postId : postIds) {
            postMemoryStatusRepository.findForOwnerAndPost(ownerId, postId)
                    .orElseThrow(() -> new PostNotFoundForMemoryStatusException(postId));

            List<EmbeddingInputChunk> chunks = postMemoryStatusRepository.findActiveChunksForPost(ownerId, postId);
            if (chunks.isEmpty()) {
                continue;
            }

            Optional<AsyncJobRecord> job = memoryEmbeddingJobEnqueuer.enqueueForChunks(
                    ownerId,
                    postId,
                    chunks,
                    reason);
            if (job.isPresent()) {
                selectedJob = job.get();
            }
        }

        if (selectedJob == null) {
            throw new ReindexRequestInvalidException("No active chunks found for requested posts.");
        }
        return AsyncJobResponse.from(selectedJob);
    }

    @Transactional(readOnly = true)
    AsyncJobResponse getJob(UUID ownerId, UUID jobId) {
        return asyncJobCommandService.findForOwner(ownerId, jobId)
                .map(AsyncJobResponse::from)
                .orElseThrow(() -> new JobNotFoundException(jobId));
    }

    @Transactional(readOnly = true)
    MemorySearchResponse searchMemories(UUID ownerId, MemorySearchRequest request) {
        String query = normalizeQuery(request.query());
        String scope = normalizeScope(request.scope());
        int limit = normalizeLimit(request.limit());

        QueryEmbedding queryEmbedding;
        try {
            queryEmbedding = queryEmbeddingService.create(query);
        } catch (RuntimeException exception) {
            throw new MemorySearchEmbeddingFailedException(exception);
        }

        List<MemoryVectorSearchCandidate> candidates = memoryVectorSearchRepository.searchMe(
                ownerId,
                queryEmbedding.vector(),
                queryEmbedding.provider(),
                queryEmbedding.model(),
                queryEmbedding.dimension(),
                limit);
        return MemorySearchResponse.of(query, scope, candidates);
    }

    private List<UUID> normalizePostIds(List<UUID> postIds) {
        if (postIds == null) {
            return List.of();
        }
        return postIds.stream()
                .distinct()
                .toList();
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return DEFAULT_MANUAL_RETRY_REASON;
        }
        return reason;
    }

    private String normalizeQuery(String query) {
        String normalized = query.trim();
        if (normalized.isEmpty()) {
            throw new MemorySearchRequestInvalidException("query must not be blank.");
        }
        return normalized;
    }

    private String normalizeScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return SCOPE_ME;
        }
        String normalized = scope.trim();
        if (!SCOPE_ME.equals(normalized)) {
            throw new MemorySearchRequestInvalidException("scope must be me for P1 memory search.");
        }
        return normalized;
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_MEMORY_SEARCH_LIMIT;
        }
        return limit;
    }
}
