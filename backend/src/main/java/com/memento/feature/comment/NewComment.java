package com.memento.feature.comment;

import java.time.Instant;
import java.util.UUID;

record NewComment(
        UUID id,
        UUID postId,
        UUID authorId,
        String content,
        Instant createdAt) {
}
