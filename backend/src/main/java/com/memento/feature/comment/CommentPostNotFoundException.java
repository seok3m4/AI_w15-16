package com.memento.feature.comment;

import java.util.UUID;

class CommentPostNotFoundException extends RuntimeException {

    CommentPostNotFoundException(UUID postId) {
        super("Post %s was not found.".formatted(postId));
    }
}
