package com.memento.feature.like;

import java.time.Clock;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PostLikeCommandService {

    private final PostLikeRepository postLikeRepository;
    private final Clock clock;

    @Autowired
    PostLikeCommandService(PostLikeRepository postLikeRepository) {
        this(postLikeRepository, Clock.systemUTC());
    }

    PostLikeCommandService(PostLikeRepository postLikeRepository, Clock clock) {
        this.postLikeRepository = postLikeRepository;
        this.clock = clock;
    }

    @Transactional
    PostLikeResponse like(UUID currentUserId, UUID postId) {
        return postLikeRepository.likeAccessiblePost(postId, currentUserId, clock.instant())
                .map(PostLikeResponse::from)
                .orElseThrow(() -> new PostLikePostNotFoundException(postId));
    }

    @Transactional
    PostLikeResponse unlike(UUID currentUserId, UUID postId) {
        return postLikeRepository.unlikeAccessiblePost(postId, currentUserId)
                .map(PostLikeResponse::from)
                .orElseThrow(() -> new PostLikePostNotFoundException(postId));
    }
}
