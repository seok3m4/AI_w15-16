package com.memento.feature.comment;

import java.time.Instant;
import java.util.UUID;

record CommentRecord(
        UUID id,
        UUID postId,
        UUID authorId,
        String authorNickname,
        String content,
        Instant createdAt,
        Instant updatedAt) {
}
