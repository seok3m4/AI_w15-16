package com.memento.feature.memory;

import java.util.UUID;

class PostNotFoundForMemoryStatusException extends RuntimeException {

    PostNotFoundForMemoryStatusException(UUID postId) {
        super("Post not found: " + postId);
    }
}
