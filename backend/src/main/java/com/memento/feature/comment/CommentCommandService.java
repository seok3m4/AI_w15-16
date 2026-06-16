package com.memento.feature.comment;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CommentCommandService {

    private final CommentRepository commentRepository;
    private final Clock clock;

    CommentCommandService(CommentRepository commentRepository, Clock clock) {
        this.commentRepository = commentRepository;
        this.clock = clock;
    }

    @Transactional
    CommentResponse update(UUID currentUserId, UUID commentId, CreateCommentRequest request) {
        Instant now = clock.instant();
        return commentRepository.updateByAuthor(
                        commentId,
                        currentUserId,
                        request.content().trim(),
                        now)
                .map(CommentResponse::from)
                .orElseThrow(() -> new CommentNotFoundException(commentId));
    }

    @Transactional
    void delete(UUID currentUserId, UUID commentId) {
        if (!commentRepository.softDeleteByAuthor(commentId, currentUserId, clock.instant())) {
            throw new CommentNotFoundException(commentId);
        }
    }
}
