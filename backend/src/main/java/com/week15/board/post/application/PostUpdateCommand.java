package com.week15.board.post.application;

public record PostUpdateCommand(
        String title,
        String content
) {
}

