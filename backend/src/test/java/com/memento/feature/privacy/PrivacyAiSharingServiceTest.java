package com.memento.feature.privacy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PrivacyAiSharingServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void updateAiSharingStoresCurrentUsersConsentAndTimestamp() {
        CapturingRepository repository = CapturingRepository.withUpdatedSetting();
        PrivacyAiSharingService service = new PrivacyAiSharingService(repository, CLOCK);

        AiSharingSettingResponse response = service.updateAiSharing(USER_ID, true);

        assertThat(response.friendAiSharingEnabled()).isTrue();
        assertThat(response.updatedAt()).isEqualTo(NOW);
        assertThat(repository.updatedUserId).isEqualTo(USER_ID);
        assertThat(repository.updatedEnabled).isTrue();
        assertThat(repository.updatedAt).isEqualTo(NOW);
    }

    @Test
    void updateAiSharingRejectsMissingOrInactiveUser() {
        PrivacyAiSharingService service = new PrivacyAiSharingService(
                CapturingRepository.withoutUpdatedSetting(),
                CLOCK);

        assertThatThrownBy(() -> service.updateAiSharing(USER_ID, true))
                .isInstanceOf(PrivacyUnauthorizedException.class);
    }

    private static class CapturingRepository implements PrivacySettingRepository {

        private final Optional<AiSharingSettingRecord> updatedSetting;
        private UUID updatedUserId;
        private Boolean updatedEnabled;
        private Instant updatedAt;

        private CapturingRepository(Optional<AiSharingSettingRecord> updatedSetting) {
            this.updatedSetting = updatedSetting;
        }

        private static CapturingRepository withUpdatedSetting() {
            return new CapturingRepository(Optional.of(new AiSharingSettingRecord(true, NOW)));
        }

        private static CapturingRepository withoutUpdatedSetting() {
            return new CapturingRepository(Optional.empty());
        }

        @Override
        public Optional<AiSharingSettingRecord> updateAiSharing(UUID userId, boolean enabled, Instant updatedAt) {
            this.updatedUserId = userId;
            this.updatedEnabled = enabled;
            this.updatedAt = updatedAt;
            return updatedSetting;
        }

        @Override
        public boolean isFriendAiSharingEnabled(UUID userId) {
            return false;
        }
    }
}
