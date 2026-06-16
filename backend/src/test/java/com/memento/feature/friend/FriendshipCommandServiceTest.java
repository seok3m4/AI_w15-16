package com.memento.feature.friend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FriendshipCommandServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FRIEND_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID FRIENDSHIP_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Test
    void createRequestStoresPendingFriendshipBetweenTwoActiveUsers() {
        FakeFriendshipRepository repository = new FakeFriendshipRepository();
        repository.requester = Optional.of(new FriendshipUserRecord(USER_ID, "cutan"));
        repository.addressee = Optional.of(new FriendshipUserRecord(FRIEND_ID, "friend"));
        FriendshipCommandService service = service(repository);

        FriendshipResponse response = service.createRequest(USER_ID, new CreateFriendshipRequest(FRIEND_ID));

        assertThat(response.id()).isEqualTo(FRIENDSHIP_ID);
        assertThat(response.requester().nickname()).isEqualTo("cutan");
        assertThat(response.addressee().nickname()).isEqualTo("friend");
        assertThat(response.status()).isEqualTo("pending");
        assertThat(response.createdAt()).isEqualTo(NOW);
        assertThat(repository.inserted.leastUserId()).isEqualTo(USER_ID);
        assertThat(repository.inserted.greatestUserId()).isEqualTo(FRIEND_ID);
    }

    @Test
    void createRequestRejectsSelfFriendship() {
        FriendshipCommandService service = service(new FakeFriendshipRepository());

        assertThatThrownBy(() -> service.createRequest(USER_ID, new CreateFriendshipRequest(USER_ID)))
                .isInstanceOf(CannotFriendSelfException.class);
    }

    @Test
    void createRequestRejectsUnknownAddressee() {
        FakeFriendshipRepository repository = new FakeFriendshipRepository();
        repository.requester = Optional.of(new FriendshipUserRecord(USER_ID, "cutan"));
        repository.addressee = Optional.empty();
        FriendshipCommandService service = service(repository);

        assertThatThrownBy(() -> service.createRequest(USER_ID, new CreateFriendshipRequest(FRIEND_ID)))
                .isInstanceOf(FriendshipUserNotFoundException.class);
    }

    @Test
    void createRequestRejectsExistingPendingOrAcceptedPair() {
        FakeFriendshipRepository repository = new FakeFriendshipRepository();
        repository.requester = Optional.of(new FriendshipUserRecord(USER_ID, "cutan"));
        repository.addressee = Optional.of(new FriendshipUserRecord(FRIEND_ID, "friend"));
        repository.activePairExists = true;
        FriendshipCommandService service = service(repository);

        assertThatThrownBy(() -> service.createRequest(USER_ID, new CreateFriendshipRequest(FRIEND_ID)))
                .isInstanceOf(FriendshipAlreadyExistsException.class);
    }

    @Test
    void acceptRequestUpdatesOnlyPendingRequestForCurrentAddressee() {
        FakeFriendshipRepository repository = new FakeFriendshipRepository();
        repository.statusUpdate = Optional.of(new FriendshipStatusRecord(FRIENDSHIP_ID, "accepted", NOW));
        FriendshipCommandService service = service(repository);

        FriendshipStatusResponse response = service.accept(USER_ID, FRIENDSHIP_ID);

        assertThat(response.status()).isEqualTo("accepted");
        assertThat(repository.lastStatus).isEqualTo("accepted");
        assertThat(repository.lastAddresseeId).isEqualTo(USER_ID);
    }

    @Test
    void rejectRequestUpdatesOnlyPendingRequestForCurrentAddressee() {
        FakeFriendshipRepository repository = new FakeFriendshipRepository();
        repository.statusUpdate = Optional.of(new FriendshipStatusRecord(FRIENDSHIP_ID, "rejected", NOW));
        FriendshipCommandService service = service(repository);

        FriendshipStatusResponse response = service.reject(USER_ID, FRIENDSHIP_ID);

        assertThat(response.status()).isEqualTo("rejected");
        assertThat(repository.lastStatus).isEqualTo("rejected");
        assertThat(repository.lastAddresseeId).isEqualTo(USER_ID);
    }

    @Test
    void acceptMissingRequestReturnsNotFound() {
        FriendshipCommandService service = service(new FakeFriendshipRepository());

        assertThatThrownBy(() -> service.accept(USER_ID, FRIENDSHIP_ID))
                .isInstanceOf(FriendshipNotFoundException.class);
    }

    private FriendshipCommandService service(FakeFriendshipRepository repository) {
        return new FriendshipCommandService(repository, Clock.fixed(NOW, ZoneOffset.UTC), () -> FRIENDSHIP_ID);
    }

    private static class FakeFriendshipRepository implements FriendshipRepository {

        Optional<FriendshipUserRecord> requester = Optional.empty();
        Optional<FriendshipUserRecord> addressee = Optional.empty();
        boolean activePairExists;
        NewFriendship inserted;
        Optional<FriendshipStatusRecord> statusUpdate = Optional.empty();
        UUID lastAddresseeId;
        String lastStatus;

        @Override
        public Optional<FriendshipUserRecord> findActiveUserById(UUID userId) {
            if (USER_ID.equals(userId)) {
                return requester;
            }
            if (FRIEND_ID.equals(userId)) {
                return addressee;
            }
            return Optional.empty();
        }

        @Override
        public boolean existsPendingOrAcceptedBetween(UUID userId, UUID otherUserId) {
            return activePairExists;
        }

        @Override
        public void insertPending(NewFriendship friendship) {
            inserted = friendship;
        }

        @Override
        public Optional<FriendshipStatusRecord> updatePendingForAddressee(
                UUID friendshipId,
                UUID addresseeId,
                String status,
                Instant respondedAt) {
            lastAddresseeId = addresseeId;
            lastStatus = status;
            return statusUpdate;
        }
    }
}
