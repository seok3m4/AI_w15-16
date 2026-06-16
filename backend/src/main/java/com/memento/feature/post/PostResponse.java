package com.memento.feature.post;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

record PostResponse(
        UUID id,
        PostAuthorResponse author,
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

    static PostResponse from(PostRecord record) {
        return new PostResponse(
                record.id(),
                new PostAuthorResponse(record.authorId(), record.authorNickname()),
                record.title(),
                record.content(),
                record.tags(),
                record.commentCount(),
                record.likeCount(),
                record.likedByMe(),
                record.accessScope(),
                record.memoryStatus(),
                record.createdAt(),
                record.updatedAt());
    }
}
