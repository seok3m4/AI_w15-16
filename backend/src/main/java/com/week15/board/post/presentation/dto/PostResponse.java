package com.week15.board.post.presentation.dto;

import com.week15.board.post.domain.Post;
import com.week15.board.post.domain.PostStatus;
import java.time.Instant;

public record PostResponse(
        Long id,
        String title,
        String content,
        String authorName,
        long viewCount,
        PostStatus status,
        Instant createdAt,
        Instant updatedAt
) {

    public static PostResponse from(Post post) {
        return new PostResponse(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                post.getAuthorName(),
                post.getViewCount(),
                post.getStatus(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}

