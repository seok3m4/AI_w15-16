package com.memento.feature.friend;

import java.time.Instant;
import java.util.UUID;

record FriendshipListItemResponse(
        UUID id,
        FriendshipUserResponse user,
        String status,
        String direction,
        Instant createdAt,
        Instant updatedAt) {

    static FriendshipListItemResponse from(FriendshipListRecord record) {
        return new FriendshipListItemResponse(
                record.id(),
                record.user().toResponse(),
                record.status(),
                record.direction(),
                record.createdAt(),
                record.updatedAt());
    }
}
