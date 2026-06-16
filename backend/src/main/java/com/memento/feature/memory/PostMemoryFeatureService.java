package com.memento.feature.memory;

import com.memento.feature.embedding.EmbeddingInputChunk;
import com.memento.feature.embedding.MemoryEmbeddingJobEnqueuer;
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

    private final PostMemoryStatusRepository postMemoryStatusRepository;
    private final MemoryEmbeddingJobEnqueuer memoryEmbeddingJobEnqueuer;
    private final AsyncJobCommandService asyncJobCommandService;

    PostMemoryFeatureService(
            PostMemoryStatusRepository postMemoryStatusRepository,
            MemoryEmbeddingJobEnqueuer memoryEmbeddingJobEnqueuer,
            AsyncJobCommandService asyncJobCommandService) {
        this.postMemoryStatusRepository = postMemoryStatusRepository;
        this.memoryEmbeddingJobEnqueuer = memoryEmbeddingJobEnqueuer;
        this.asyncJobCommandService = asyncJobCommandService;
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
}
