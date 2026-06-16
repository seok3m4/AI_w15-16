package com.memento.feature.comment;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CommentCreateService {

    private final CommentRepository commentRepository;
    private final Supplier<UUID> idSupplier;
    private final Clock clock;

    @Autowired
    CommentCreateService(CommentRepository commentRepository, Clock clock) {
        this(commentRepository, UUID::randomUUID, clock);
    }

    CommentCreateService(CommentRepository commentRepository, Supplier<UUID> idSupplier, Clock clock) {
        this.commentRepository = commentRepository;
        this.idSupplier = idSupplier;
        this.clock = clock;
    }

    @Transactional
    CommentResponse create(UUID currentUserId, UUID postId, CreateCommentRequest request) {
        Instant now = clock.instant();
        NewComment comment = new NewComment(
                idSupplier.get(),
                postId,
                currentUserId,
                request.content().trim(),
                now);
        return commentRepository.saveOnOwnedPost(comment)
                .map(CommentResponse::from)
                .orElseThrow(() -> new CommentPostNotFoundException(postId));
    }
}
