package com.memento.feature.post;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PostCommandService {

    private final PostRepository postRepository;
    private final Clock clock;

    PostCommandService(PostRepository postRepository, Clock clock) {
        this.postRepository = postRepository;
        this.clock = clock;
    }

    @Transactional
    PostResponse update(UUID currentUserId, UUID postId, CreatePostRequest request) {
        Instant now = clock.instant();
        return postRepository.updateByAuthor(
                        postId,
                        currentUserId,
                        request.title().trim(),
                        request.content().trim(),
                        PostTagNames.normalize(request.tagNames()),
                        now)
                .map(PostResponse::from)
                .orElseThrow(() -> new PostNotFoundException(postId));
    }

    @Transactional
    void delete(UUID currentUserId, UUID postId) {
        if (!postRepository.softDeleteByAuthor(postId, currentUserId, clock.instant())) {
            throw new PostNotFoundException(postId);
        }
    }
}
