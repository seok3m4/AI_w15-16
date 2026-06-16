package com.memento.feature.post;

import java.util.UUID;

class PostNotFoundException extends RuntimeException {

    PostNotFoundException(UUID postId) {
        super("Post not found: " + postId);
    }
}
