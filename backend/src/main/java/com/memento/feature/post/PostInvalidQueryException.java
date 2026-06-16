package com.memento.feature.post;

class PostInvalidQueryException extends RuntimeException {

    PostInvalidQueryException(String message) {
        super(message);
    }
}
