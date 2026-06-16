package com.memento.feature.comment;

import java.time.Instant;
import java.util.UUID;

record CommentResponse(
        UUID id,
        UUID postId,
        CommentAuthorResponse author,
        String content,
        Instant createdAt,
        Instant updatedAt) {

    static CommentResponse from(CommentRecord record) {
        return new CommentResponse(
                record.id(),
                record.postId(),
                new CommentAuthorResponse(record.authorId(), record.authorNickname()),
                record.content(),
                record.createdAt(),
                record.updatedAt());
    }
}
