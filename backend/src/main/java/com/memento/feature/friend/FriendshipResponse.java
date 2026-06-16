package com.memento.feature.friend;

import java.time.Instant;
import java.util.UUID;

record FriendshipResponse(
        UUID id,
        FriendshipUserResponse requester,
        FriendshipUserResponse addressee,
        String status,
        Instant createdAt,
        Instant updatedAt) {
}
