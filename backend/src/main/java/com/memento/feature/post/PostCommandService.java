package com.memento.feature.post;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PostCommandService {

    private final PostRepository postRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Autowired
    PostCommandService(PostRepository postRepository, ApplicationEventPublisher eventPublisher, Clock clock) {
        this.postRepository = postRepository;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    PostCommandService(PostRepository postRepository, Clock clock) {
        this(postRepository, event -> {}, clock);
    }

    @Transactional
    PostResponse update(UUID currentUserId, UUID postId, CreatePostRequest request) {
        Instant now = clock.instant();
        PostResponse response = postRepository.updateByAuthor(
                        postId,
                        currentUserId,
                        request.title().trim(),
                        request.content().trim(),
                        PostTagNames.normalize(request.tagNames()),
                        now)
                .map(PostResponse::from)
                .orElseThrow(() -> new PostNotFoundException(postId));
        eventPublisher.publishEvent(new PostUpdatedEvent(postId, currentUserId));
        return response;
    }

    @Transactional
    void delete(UUID currentUserId, UUID postId) {
        if (!postRepository.softDeleteByAuthor(postId, currentUserId, clock.instant())) {
            throw new PostNotFoundException(postId);
        }
        eventPublisher.publishEvent(new PostDeletedEvent(postId, currentUserId));
    }
}
