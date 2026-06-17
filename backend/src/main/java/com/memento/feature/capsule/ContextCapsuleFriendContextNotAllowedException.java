package com.memento.feature.capsule;

class ContextCapsuleFriendContextNotAllowedException extends RuntimeException {

    ContextCapsuleFriendContextNotAllowedException() {
        super("Friend AI context is not allowed for this capsule.");
    }
}
