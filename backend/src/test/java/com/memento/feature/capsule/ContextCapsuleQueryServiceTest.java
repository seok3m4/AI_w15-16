package com.memento.feature.capsule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.memento.feature.friend.FriendshipAccessService;
import com.memento.feature.privacy.AiSharingConsentReader;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ContextCapsuleQueryServiceTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FRIEND_ID =
            UUID.fromString("12121212-1212-1212-1212-121212121212");
    private static final UUID CAPSULE_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID POST_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-17T00:00:00Z");

    @Test
    void listReturnsCurrentUserCapsulesWithPageMetadata() {
        CapturingContextCapsuleRepository repository = new CapturingContextCapsuleRepository();
        repository.pageRecords = List.of(capsuleRecord("title-1", "purpose-1", false, List.of()));
        repository.totalCount = 1;
        ContextCapsuleQueryService service = service(repository);

        ContextCapsuleListResponse response = service.list(OWNER_ID, 0, 20);

        assertThat(repository.capturedOwnerId).isEqualTo(OWNER_ID);
        assertThat(repository.capturedLimit).isEqualTo(20);
        assertThat(repository.capturedOffset).isZero();
        assertThat(response.items()).containsExactly(new ContextCapsuleSummaryResponse(
                CAPSULE_ID,
                "title-1",
                "purpose-1",
                false,
                NOW,
                NOW));
        assertThat(response.page()).isEqualTo(new ContextCapsulePageResponse(0, 20, 1, 1));
    }

    @Test
    void getReturnsOwnCapsuleByIdOr404WhenNotOwnedOrDeleted() {
        CapturingContextCapsuleRepository repository = new CapturingContextCapsuleRepository();
        repository.findRecord = Optional.of(capsuleRecord("title-1", "purpose-1", false, List.of()));
        ContextCapsuleQueryService service = service(repository);

        ContextCapsuleResponse response = service.get(OWNER_ID, CAPSULE_ID);

        assertThat(repository.capturedOwnerIdForLookup).isEqualTo(OWNER_ID);
        assertThat(repository.capturedLookupCapsuleId).isEqualTo(CAPSULE_ID);
        assertThat(response.id()).isEqualTo(CAPSULE_ID);
    }

    @Test
    void getThrowsNotFoundWhenNoActiveCapsuleExists() {
        ContextCapsuleQueryService service = service(new CapturingContextCapsuleRepository());

        assertThatThrownBy(() -> service.get(OWNER_ID, CAPSULE_ID))
                .isInstanceOf(ContextCapsuleNotFoundException.class);
    }

    @Test
    void getFiltersFriendSourcesWhenConsentWasRevoked() {
        CapturingContextCapsuleRepository repository = new CapturingContextCapsuleRepository();
        repository.findRecord = Optional.of(capsuleRecord(
                "title-1",
                "purpose-1",
                true,
                List.of(sourceRecord(POST_ID, FRIEND_ID))));
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader consentReader = mock(AiSharingConsentReader.class);
        given(friendshipAccessService.hasAcceptedFriendship(OWNER_ID, FRIEND_ID)).willReturn(true);
        given(consentReader.isFriendAiSharingEnabled(FRIEND_ID)).willReturn(false);
        ContextCapsuleQueryService service = new ContextCapsuleQueryService(
                repository,
                friendshipAccessService,
                consentReader);

        ContextCapsuleResponse response = service.get(OWNER_ID, CAPSULE_ID);

        assertThat(response.containsFriendContext()).isTrue();
        assertThat(response.sources()).isEmpty();
    }

    @Test
    void compactContextReturnsOnlyExternalLlmFieldsForOwnCapsule() {
        UUID secondPostId = UUID.fromString("44444444-4444-4444-4444-444444444444");
        CapturingContextCapsuleRepository repository = new CapturingContextCapsuleRepository();
        repository.findRecord = Optional.of(new ContextCapsuleRecord(
                CAPSULE_ID,
                OWNER_ID,
                "title-1",
                "purpose-1",
                "query",
                "summary-1",
                List.of("fact-1", "fact-2"),
                List.of("tag1", "tag2"),
                false,
                List.of(
                        sourceRecord(POST_ID, OWNER_ID),
                        sourceRecord(secondPostId, OWNER_ID)),
                NOW,
                NOW));
        ContextCapsuleQueryService service = service(repository);

        ContextCapsuleCompactContextResponse response = service.compactContext(OWNER_ID, CAPSULE_ID);

        assertThat(repository.capturedOwnerIdForLookup).isEqualTo(OWNER_ID);
        assertThat(repository.capturedLookupCapsuleId).isEqualTo(CAPSULE_ID);
        assertThat(response).isEqualTo(new ContextCapsuleCompactContextResponse(
                "purpose-1",
                "summary-1",
                List.of("fact-1", "fact-2"),
                List.of(POST_ID, secondPostId),
                List.of("tag1", "tag2")));
    }

    @Test
    void compactContextBlocksFriendCapsuleWhenConsentWasRevoked() {
        CapturingContextCapsuleRepository repository = new CapturingContextCapsuleRepository();
        repository.findRecord = Optional.of(capsuleRecord(
                "title-1",
                "purpose-1",
                true,
                List.of(sourceRecord(POST_ID, FRIEND_ID))));
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader consentReader = mock(AiSharingConsentReader.class);
        given(friendshipAccessService.hasAcceptedFriendship(OWNER_ID, FRIEND_ID)).willReturn(true);
        given(consentReader.isFriendAiSharingEnabled(FRIEND_ID)).willReturn(false);
        ContextCapsuleQueryService service = new ContextCapsuleQueryService(
                repository,
                friendshipAccessService,
                consentReader);

        assertThatThrownBy(() -> service.compactContext(OWNER_ID, CAPSULE_ID))
                .isInstanceOf(ContextCapsuleFriendContextStaleException.class);
    }

    @Test
    void compactContextThrowsNotFoundWhenNoActiveCapsuleExists() {
        ContextCapsuleQueryService service = service(new CapturingContextCapsuleRepository());

        assertThatThrownBy(() -> service.compactContext(OWNER_ID, CAPSULE_ID))
                .isInstanceOf(ContextCapsuleNotFoundException.class);
    }

    @Test
    void listRejectsInvalidPageParameters() {
        ContextCapsuleQueryService service = service(new CapturingContextCapsuleRepository());

        assertThatThrownBy(() -> service.list(OWNER_ID, -1, 20))
                .isInstanceOf(ContextCapsuleInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(OWNER_ID, 0, 0))
                .isInstanceOf(ContextCapsuleInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(OWNER_ID, 0, 101))
                .isInstanceOf(ContextCapsuleInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(OWNER_ID, Integer.MAX_VALUE, 100))
                .isInstanceOf(ContextCapsuleInvalidQueryException.class);
    }

    @Test
    void listRoundsUpTotalPagesForPartialLastPage() {
        CapturingContextCapsuleRepository repository = new CapturingContextCapsuleRepository();
        repository.totalCount = 5;
        ContextCapsuleQueryService service = service(repository);

        ContextCapsuleListResponse response = service.list(OWNER_ID, 1, 2);

        assertThat(response.page()).isEqualTo(new ContextCapsulePageResponse(1, 2, 5, 3));
    }

    private static ContextCapsuleRecord capsuleRecord(
            String title,
            String purpose,
            boolean containsFriendContext,
            List<ContextCapsuleSourceRecord> sources) {
        return new ContextCapsuleRecord(
                CAPSULE_ID,
                OWNER_ID,
                title,
                purpose,
                "query",
                "summary",
                List.of(),
                List.of("tag1"),
                containsFriendContext,
                sources,
                NOW,
                NOW);
    }

    private static ContextCapsuleSourceRecord sourceRecord(UUID postId, UUID ownerUserId) {
        return new ContextCapsuleSourceRecord(
                postId,
                UUID.fromString("55555555-5555-5555-5555-555555555555"),
                ownerUserId,
                "cutan",
                "source-title",
                "source-snippet",
                "post",
                NOW);
    }

    private ContextCapsuleQueryService service(ContextCapsuleRepository repository) {
        return new ContextCapsuleQueryService(
                repository,
                mock(FriendshipAccessService.class),
                mock(AiSharingConsentReader.class));
    }

    private static class CapturingContextCapsuleRepository implements ContextCapsuleRepository {

        private List<ContextCapsuleRecord> pageRecords = List.of();
        private long totalCount;
        private UUID capturedOwnerId;
        private int capturedLimit;
        private int capturedOffset;
        private UUID capturedOwnerIdForLookup;
        private UUID capturedLookupCapsuleId;
        private Optional<ContextCapsuleRecord> findRecord = Optional.empty();

        @Override
        public ContextCapsuleRecord save(NewContextCapsule capsule) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<ContextCapsuleRecord> findPageByOwner(UUID ownerId, int limit, int offset) {
            capturedOwnerId = ownerId;
            capturedLimit = limit;
            capturedOffset = offset;
            return pageRecords;
        }

        @Override
        public long countByOwner(UUID ownerId) {
            capturedOwnerId = ownerId;
            return totalCount;
        }

        @Override
        public Optional<ContextCapsuleRecord> findActiveByOwner(UUID ownerId, UUID capsuleId) {
            capturedOwnerIdForLookup = ownerId;
            capturedLookupCapsuleId = capsuleId;
            return findRecord;
        }

        @Override
        public boolean updateByOwner(UUID capsuleId, UUID ownerId, String title, String purpose, Instant updatedAt) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean softDeleteByOwner(UUID ownerId, UUID capsuleId, Instant deletedAt) {
            throw new UnsupportedOperationException();
        }
    }
}
