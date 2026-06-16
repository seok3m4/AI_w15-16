package com.memento.feature.friend;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface FriendshipRepository {

    Optional<FriendshipUserRecord> findActiveUserById(UUID userId);

    boolean existsPendingOrAcceptedBetween(UUID userId, UUID otherUserId);

    void insertPending(NewFriendship friendship);

    Optional<FriendshipStatusRecord> updatePendingForAddressee(
            UUID friendshipId,
            UUID addresseeId,
            String status,
            Instant respondedAt);
}
