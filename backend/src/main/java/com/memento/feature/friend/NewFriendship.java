package com.memento.feature.friend;

import java.time.Instant;
import java.util.UUID;

record NewFriendship(
        UUID id,
        UUID requesterId,
        UUID addresseeId,
        UUID leastUserId,
        UUID greatestUserId,
        Instant requestedAt) {
}
