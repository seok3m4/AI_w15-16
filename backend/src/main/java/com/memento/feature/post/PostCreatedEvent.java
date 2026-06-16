package com.memento.feature.post;

import java.util.UUID;

public record PostCreatedEvent(UUID postId, UUID ownerId) {
}
