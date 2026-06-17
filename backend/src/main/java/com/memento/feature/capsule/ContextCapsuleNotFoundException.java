package com.memento.feature.capsule;

import java.util.UUID;

class ContextCapsuleNotFoundException extends RuntimeException {

    ContextCapsuleNotFoundException(UUID contextCapsuleId) {
        super("Context capsule was not found: " + contextCapsuleId);
    }
}

