package com.memento.feature.capsule;

class ContextCapsuleFriendContextStaleException extends RuntimeException {

    ContextCapsuleFriendContextStaleException() {
        super("Friend context is no longer available. Regenerate this capsule before exporting compact context.");
    }
}
