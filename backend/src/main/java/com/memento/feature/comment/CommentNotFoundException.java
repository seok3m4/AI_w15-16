package com.memento.feature.comment;

import java.util.UUID;

class CommentNotFoundException extends RuntimeException {

    CommentNotFoundException(UUID commentId) {
        super("Comment not found: " + commentId);
    }
}
