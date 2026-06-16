package com.memento.feature.friend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FriendshipQueryServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FRIEND_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID FRIENDSHIP_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Test
    void listReturnsPagedFriendships() {
        FakeFriendshipRepository repository = new FakeFriendshipRepository();
        repository.records = List.of(new FriendshipListRecord(
                FRIENDSHIP_ID,
                new FriendshipUserRecord(FRIEND_ID, "friend"),
                "accepted",
                "incoming",
                NOW,
                NOW));
        repository.totalCount = 1;
        FriendshipQueryService service = new FriendshipQueryService(repository);

        FriendshipListResponse response = service.list(USER_ID, "accepted", 0, 20);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).user().id()).isEqualTo(FRIEND_ID);
        assertThat(response.items().get(0).direction()).isEqualTo("incoming");
        assertThat(response.page().totalCount()).isEqualTo(1);
        assertThat(response.page().totalPages()).isEqualTo(1);
        assertThat(repository.lastStatus).isEqualTo("accepted");
        assertThat(repository.lastLimit).isEqualTo(20);
        assertThat(repository.lastOffset).isZero();
    }

    @Test
    void listRejectsUnsupportedStatus() {
        FriendshipQueryService service = new FriendshipQueryService(new FakeFriendshipRepository());

        assertThatThrownBy(() -> service.list(USER_ID, "removed", 0, 20))
                .isInstanceOf(FriendshipInvalidQueryException.class);
    }

    @Test
    void listRejectsInvalidPageAndSize() {
        FriendshipQueryService service = new FriendshipQueryService(new FakeFriendshipRepository());

        assertThatThrownBy(() -> service.list(USER_ID, "accepted", -1, 20))
                .isInstanceOf(FriendshipInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(USER_ID, "accepted", 0, 101))
                .isInstanceOf(FriendshipInvalidQueryException.class);
    }

    private static class FakeFriendshipRepository implements FriendshipRepository {

        List<FriendshipListRecord> records = List.of();
        long totalCount;
        String lastStatus;
        int lastLimit;
        int lastOffset;

        @Override
        public Optional<FriendshipUserRecord> findActiveUserById(UUID userId) {
            return Optional.empty();
        }

        @Override
        public boolean existsPendingOrAcceptedBetween(UUID userId, UUID otherUserId) {
            return false;
        }

        @Override
        public boolean existsAcceptedBetween(UUID userId, UUID otherUserId) {
            return false;
        }

        @Override
        public void insertPending(NewFriendship friendship) {
        }

        @Override
        public Optional<FriendshipStatusRecord> updatePendingForAddressee(
                UUID friendshipId,
                UUID addresseeId,
                String status,
                Instant respondedAt) {
            return Optional.empty();
        }

        @Override
        public List<FriendshipListRecord> findPageByUserAndStatus(
                UUID userId,
                String status,
                int limit,
                int offset) {
            lastStatus = status;
            lastLimit = limit;
            lastOffset = offset;
            return records;
        }

        @Override
        public long countByUserAndStatus(UUID userId, String status) {
            return totalCount;
        }

        @Override
        public Optional<FriendshipStatusRecord> cancelPendingForRequester(
                UUID friendshipId,
                UUID requesterId,
                Instant cancelledAt) {
            return Optional.empty();
        }

        @Override
        public Optional<FriendshipStatusRecord> removeAcceptedForParticipant(
                UUID friendshipId,
                UUID participantId,
                Instant removedAt) {
            return Optional.empty();
        }
    }
}
