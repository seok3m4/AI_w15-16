package com.memento.feature.friend;

import java.time.Instant;
import java.util.UUID;

record FriendshipListRecord(
        UUID id,
        FriendshipUserRecord user,
        String status,
        String direction,
        Instant createdAt,
        Instant updatedAt) {
}
