package com.memento.feature.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthCurrentUserServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Test
    void meReturnsActiveUserPrivateProfile() {
        CapturingRepository repository = CapturingRepository.withUser();
        AuthCurrentUserService service = new AuthCurrentUserService(
                repository,
                (ciphertext, nonce) -> "user@example.com");

        UserPrivateResponse response = service.me(USER_ID);

        assertThat(response.id()).isEqualTo(USER_ID);
        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(response.nickname()).isEqualTo("cutan");
        assertThat(response.friendAiSharingEnabled()).isTrue();
        assertThat(response.createdAt()).isEqualTo(Instant.parse("2026-06-15T03:00:00Z"));
        assertThat(repository.requestedUserId).isEqualTo(USER_ID);
    }

    @Test
    void meRejectsMissingOrInactiveUser() {
        AuthCurrentUserService service = new AuthCurrentUserService(
                CapturingRepository.withoutUser(),
                (ciphertext, nonce) -> "user@example.com");

        assertThatThrownBy(() -> service.me(USER_ID))
                .isInstanceOf(InvalidAccessTokenException.class);
    }

    private static class CapturingRepository implements AuthUserRepository {

        private final Optional<UserPrivateRecord> user;
        private UUID requestedUserId;

        private CapturingRepository(Optional<UserPrivateRecord> user) {
            this.user = user;
        }

        private static CapturingRepository withUser() {
            return new CapturingRepository(Optional.of(new UserPrivateRecord(
                    USER_ID,
                    new byte[] {1, 2, 3},
                    new byte[] {4, 5, 6},
                    "cutan",
                    true,
                    Instant.parse("2026-06-15T03:00:00Z"))));
        }

        private static CapturingRepository withoutUser() {
            return new CapturingRepository(Optional.empty());
        }

        @Override
        public boolean existsActiveByEmailLookupHash(byte[] emailLookupHash) {
            return false;
        }

        @Override
        public Optional<AuthLoginUser> findActiveLoginUserByEmailLookupHash(byte[] emailLookupHash) {
            return Optional.empty();
        }

        @Override
        public Optional<UserPrivateRecord> findActivePrivateUserById(UUID userId) {
            requestedUserId = userId;
            return user;
        }

        @Override
        public void insert(AuthUserRecord user) {
        }

        @Override
        public void insertDefaultPrivacySettings(UUID userId) {
        }
    }
}
