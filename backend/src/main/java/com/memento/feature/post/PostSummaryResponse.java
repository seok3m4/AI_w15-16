package com.memento.feature.post;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

record PostSummaryResponse(
        UUID id,
        PostAuthorResponse author,
        String title,
        String contentPreview,
        List<String> tags,
        int commentCount,
        int likeCount,
        boolean likedByMe,
        String accessScope,
        String memoryStatus,
        Instant createdAt,
        Instant updatedAt) {

    static PostSummaryResponse from(PostRecord record, String contentPreview) {
        return new PostSummaryResponse(
                record.id(),
                new PostAuthorResponse(record.authorId(), record.authorNickname()),
                record.title(),
                contentPreview,
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
