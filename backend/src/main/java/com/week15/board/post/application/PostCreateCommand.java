package com.week15.board.post.application;

public record PostCreateCommand(
        String title,
        String content,
        String authorName
) {
}

