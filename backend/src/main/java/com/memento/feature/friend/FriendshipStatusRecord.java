package com.memento.feature.friend;

import java.time.Instant;
import java.util.UUID;

record FriendshipStatusRecord(UUID id, String status, Instant updatedAt) {

    FriendshipStatusResponse toResponse() {
        return new FriendshipStatusResponse(id, status, updatedAt);
    }
}
