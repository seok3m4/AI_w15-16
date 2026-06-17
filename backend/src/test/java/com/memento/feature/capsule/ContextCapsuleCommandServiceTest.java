package com.memento.feature.capsule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ContextCapsuleCommandServiceTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CAPSULE_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-06-17T00:00:00Z");

    @Test
    void updatesOwnCapsuleWithTrimmedFields() {
        CapturingContextCapsuleRepository repository = new CapturingContextCapsuleRepository();
        repository.updateResult = true;
        repository.findRecord = Optional.of(capsuleRecord("new-title", "new-purpose"));
        ContextCapsuleCommandService service = new ContextCapsuleCommandService(repository, Clock.fixed(NOW, ZoneOffset.UTC));

        ContextCapsuleResponse response = service.update(
                OWNER_ID,
                CAPSULE_ID,
                new UpdateContextCapsuleRequest(" new-title ", " new-purpose "));

        assertThat(repository.capturedUpdateCapsuleId).isEqualTo(CAPSULE_ID);
        assertThat(repository.capturedUpdateOwnerId).isEqualTo(OWNER_ID);
        assertThat(repository.capturedUpdateTitle).isEqualTo("new-title");
        assertThat(repository.capturedUpdatePurpose).isEqualTo("new-purpose");
        assertThat(repository.capturedUpdateAt).isEqualTo(NOW);
        assertThat(response.title()).isEqualTo("new-title");
        assertThat(response.purpose()).isEqualTo("new-purpose");
    }

    @Test
    void updatesOwnCapsuleWithNoMatchThrowsNotFound() {
        ContextCapsuleCommandService service = new ContextCapsuleCommandService(
                new CapturingContextCapsuleRepository(),
                Clock.fixed(NOW, ZoneOffset.UTC));

        assertThatThrownBy(() -> service.update(
                OWNER_ID,
                CAPSULE_ID,
                new UpdateContextCapsuleRequest("new-title", "new-purpose")))
                .isInstanceOf(ContextCapsuleNotFoundException.class);
    }

    @Test
    void deletesOwnCapsuleAndReturnsNotFoundOtherwise() {
        CapturingContextCapsuleRepository repository = new CapturingContextCapsuleRepository();
        repository.deleteResult = true;
        ContextCapsuleCommandService service = new ContextCapsuleCommandService(repository, Clock.fixed(NOW, ZoneOffset.UTC));

        service.delete(OWNER_ID, CAPSULE_ID);

        assertThat(repository.capturedDeleteOwnerId).isEqualTo(OWNER_ID);
        assertThat(repository.capturedDeleteCapsuleId).isEqualTo(CAPSULE_ID);
        assertThat(repository.capturedDeleteAt).isEqualTo(NOW);
    }

    @Test
    void deletesMissingCapsuleAsNotFound() {
        ContextCapsuleCommandService service = new ContextCapsuleCommandService(
                new CapturingContextCapsuleRepository(),
                Clock.fixed(NOW, ZoneOffset.UTC));

        assertThatThrownBy(() -> service.delete(OWNER_ID, CAPSULE_ID))
                .isInstanceOf(ContextCapsuleNotFoundException.class);
    }

    private static ContextCapsuleRecord capsuleRecord(String title, String purpose) {
        return new ContextCapsuleRecord(
                CAPSULE_ID,
                OWNER_ID,
                title,
                purpose,
                "query",
                "summary",
                List.of(),
                List.of("tag"),
                false,
                List.of(),
                NOW,
                NOW);
    }

    private static class CapturingContextCapsuleRepository implements ContextCapsuleRepository {

        private boolean updateResult;
        private boolean deleteResult;
        private String capturedUpdateTitle;
        private String capturedUpdatePurpose;
        private UUID capturedUpdateCapsuleId;
        private UUID capturedUpdateOwnerId;
        private Instant capturedUpdateAt;
        private UUID capturedDeleteOwnerId;
        private UUID capturedDeleteCapsuleId;
        private Instant capturedDeleteAt;
        private Optional<ContextCapsuleRecord> findRecord = Optional.empty();

        @Override
        public ContextCapsuleRecord save(NewContextCapsule capsule) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<ContextCapsuleRecord> findPageByOwner(UUID ownerId, int limit, int offset) {
            throw new UnsupportedOperationException();
        }

        @Override
        public long countByOwner(UUID ownerId) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Optional<ContextCapsuleRecord> findActiveByOwner(UUID ownerId, UUID capsuleId) {
            return findRecord;
        }

        @Override
        public boolean updateByOwner(UUID capsuleId, UUID ownerId, String title, String purpose, Instant updatedAt) {
            capturedUpdateCapsuleId = capsuleId;
            capturedUpdateOwnerId = ownerId;
            capturedUpdateTitle = title;
            capturedUpdatePurpose = purpose;
            capturedUpdateAt = updatedAt;
            return updateResult;
        }

        @Override
        public boolean softDeleteByOwner(UUID ownerId, UUID capsuleId, Instant deletedAt) {
            capturedDeleteOwnerId = ownerId;
            capturedDeleteCapsuleId = capsuleId;
            capturedDeleteAt = deletedAt;
            return deleteResult;
        }
    }
}
