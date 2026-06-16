package com.memento.feature.like;

import java.util.UUID;

class PostLikePostNotFoundException extends RuntimeException {

    PostLikePostNotFoundException(UUID postId) {
        super("Post was not found: " + postId);
    }
}
