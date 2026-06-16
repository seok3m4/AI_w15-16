package com.memento.feature.post;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

record PostRecord(
        UUID id,
        UUID authorId,
        String authorNickname,
        String title,
        String content,
        List<String> tags,
        int commentCount,
        int likeCount,
        boolean likedByMe,
        String accessScope,
        String memoryStatus,
        Instant createdAt,
        Instant updatedAt) {
}
