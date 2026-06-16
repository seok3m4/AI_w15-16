package com.memento.feature.post;

import java.util.UUID;

public record PostDeletedEvent(UUID postId, UUID ownerId) {
}
