package com.memento.feature.post;

import java.time.Instant;
import java.util.UUID;

record PostRecentCommentResponse(
        UUID id,
        PostAuthorResponse author,
        String content,
        Instant createdAt,
        Instant updatedAt) {
}
