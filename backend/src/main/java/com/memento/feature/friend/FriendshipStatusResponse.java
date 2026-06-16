package com.memento.feature.friend;

import java.time.Instant;
import java.util.UUID;

record FriendshipStatusResponse(UUID id, String status, Instant updatedAt) {
}
