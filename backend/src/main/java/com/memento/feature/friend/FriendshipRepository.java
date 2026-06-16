package com.memento.feature.friend;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface FriendshipRepository {

    Optional<FriendshipUserRecord> findActiveUserById(UUID userId);

    boolean existsPendingOrAcceptedBetween(UUID userId, UUID otherUserId);

    boolean existsAcceptedBetween(UUID userId, UUID otherUserId);

    void insertPending(NewFriendship friendship);

    Optional<FriendshipStatusRecord> updatePendingForAddressee(
            UUID friendshipId,
            UUID addresseeId,
            String status,
            Instant respondedAt);

    List<FriendshipListRecord> findPageByUserAndStatus(
            UUID userId,
            String status,
            int limit,
            int offset);

    long countByUserAndStatus(UUID userId, String status);

    Optional<FriendshipStatusRecord> cancelPendingForRequester(
            UUID friendshipId,
            UUID requesterId,
            Instant cancelledAt);

    Optional<FriendshipStatusRecord> removeAcceptedForParticipant(
            UUID friendshipId,
            UUID participantId,
            Instant removedAt);
}
