package com.memento.feature.post;

import java.time.Instant;
import java.util.UUID;

record NewPost(
        UUID id,
        UUID authorId,
        String title,
        String content,
        String memoryStatus,
        Instant createdAt) {
}
