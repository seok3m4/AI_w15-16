package com.memento.feature.post;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

record PostDetailResponse(
        UUID id,
        PostAuthorResponse author,
        String title,
        String content,
        List<String> tags,
        List<PostRecentCommentResponse> recentComments,
        int commentCount,
        int likeCount,
        boolean likedByMe,
        String accessScope,
        String memoryStatus,
        Instant createdAt,
        Instant updatedAt) {

    static PostDetailResponse from(PostRecord record) {
        return new PostDetailResponse(
                record.id(),
                new PostAuthorResponse(record.authorId(), record.authorNickname()),
                record.title(),
                record.content(),
                record.tags(),
                List.of(),
                record.commentCount(),
                record.likeCount(),
                record.likedByMe(),
                record.accessScope(),
                record.memoryStatus(),
                record.createdAt(),
                record.updatedAt());
    }
}
