package com.memento.feature.post;

import java.util.UUID;

public record PostUpdatedEvent(UUID postId, UUID ownerId) {
}
