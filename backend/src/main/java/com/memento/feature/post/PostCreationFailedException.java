package com.memento.feature.post;

import java.util.UUID;

class PostCreationFailedException extends RuntimeException {

    PostCreationFailedException(UUID postId) {
        super("Post was inserted but could not be loaded: " + postId);
    }
}
