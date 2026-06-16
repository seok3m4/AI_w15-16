package com.memento.feature.friend;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
class FriendshipCommandService {

    private final FriendshipRepository friendshipRepository;
    private final Clock clock;
    private final Supplier<UUID> uuidSupplier;

    @Autowired
    FriendshipCommandService(FriendshipRepository friendshipRepository) {
        this(friendshipRepository, Clock.systemUTC(), UUID::randomUUID);
    }

    FriendshipCommandService(
            FriendshipRepository friendshipRepository,
            Clock clock,
            Supplier<UUID> uuidSupplier) {
        this.friendshipRepository = friendshipRepository;
        this.clock = clock;
        this.uuidSupplier = uuidSupplier;
    }

    FriendshipResponse createRequest(UUID requesterId, CreateFriendshipRequest request) {
        UUID addresseeId = request.addresseeUserId();
        if (requesterId.equals(addresseeId)) {
            throw new CannotFriendSelfException();
        }

        FriendshipUserRecord requester = friendshipRepository.findActiveUserById(requesterId)
                .orElseThrow(FriendshipUserNotFoundException::new);
        FriendshipUserRecord addressee = friendshipRepository.findActiveUserById(addresseeId)
                .orElseThrow(FriendshipUserNotFoundException::new);
        if (friendshipRepository.existsPendingOrAcceptedBetween(requesterId, addresseeId)) {
            throw new FriendshipAlreadyExistsException();
        }

        Instant now = clock.instant();
        NewFriendship friendship = new NewFriendship(
                uuidSupplier.get(),
                requesterId,
                addresseeId,
                least(requesterId, addresseeId),
                greatest(requesterId, addresseeId),
                now);
        try {
            friendshipRepository.insertPending(friendship);
        } catch (DataIntegrityViolationException exception) {
            throw new FriendshipAlreadyExistsException();
        }

        return new FriendshipResponse(
                friendship.id(),
                requester.toResponse(),
                addressee.toResponse(),
                "pending",
                now,
                now);
    }

    FriendshipStatusResponse accept(UUID currentUserId, UUID friendshipId) {
        return transition(currentUserId, friendshipId, "accepted");
    }

    FriendshipStatusResponse reject(UUID currentUserId, UUID friendshipId) {
        return transition(currentUserId, friendshipId, "rejected");
    }

    void delete(UUID currentUserId, UUID friendshipId) {
        Instant now = clock.instant();
        if (friendshipRepository.cancelPendingForRequester(friendshipId, currentUserId, now).isPresent()) {
            return;
        }
        if (friendshipRepository.removeAcceptedForParticipant(friendshipId, currentUserId, now).isPresent()) {
            return;
        }
        throw new FriendshipNotFoundException();
    }

    private FriendshipStatusResponse transition(UUID currentUserId, UUID friendshipId, String status) {
        return friendshipRepository
                .updatePendingForAddressee(friendshipId, currentUserId, status, clock.instant())
                .map(FriendshipStatusRecord::toResponse)
                .orElseThrow(FriendshipNotFoundException::new);
    }

    private UUID least(UUID userId, UUID otherUserId) {
        return userId.compareTo(otherUserId) <= 0 ? userId : otherUserId;
    }

    private UUID greatest(UUID userId, UUID otherUserId) {
        return userId.compareTo(otherUserId) >= 0 ? userId : otherUserId;
    }
}
