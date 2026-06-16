package com.memento.feature.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthSignupServiceTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-06-15T03:10:00Z"), ZoneOffset.UTC);

    @Test
    void signupStoresProtectedEmailHashedPasswordAndDefaultPrivacy() {
        CapturingRepository repository = new CapturingRepository(false);
        AuthSignupService service = new AuthSignupService(
                repository,
                rawPassword -> "argon2:" + rawPassword.length(),
                normalizedEmail -> new ProtectedEmail(
                        new byte[] {1, 2, 3},
                        new byte[] {4, 5, 6},
                        "local-dev-key",
                        ("lookup:" + normalizedEmail).getBytes(StandardCharsets.UTF_8)),
                CLOCK);

        UserPrivateResponse response = service.signup(
                new SignupRequest(" USER@example.COM ", "password1234!", "cutan"));

        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(response.nickname()).isEqualTo("cutan");
        assertThat(response.friendAiSharingEnabled()).isFalse();
        assertThat(response.createdAt()).isEqualTo(Instant.parse("2026-06-15T03:10:00Z"));

        assertThat(repository.insertedUser).isNotNull();
        assertThat(repository.insertedUser.emailLookupHash())
                .isEqualTo("lookup:user@example.com".getBytes(StandardCharsets.UTF_8));
        assertThat(repository.insertedUser.passwordHash()).isEqualTo("argon2:13");
        assertThat(repository.insertedUser.passwordHash()).doesNotContain("password1234!");
        assertThat(repository.insertedUser.emailCiphertext())
                .isNotEqualTo("user@example.com".getBytes(StandardCharsets.UTF_8));
        assertThat(repository.defaultPrivacyCreatedFor).isEqualTo(repository.insertedUser.id());
    }

    @Test
    void signupRejectsExistingActiveEmail() {
        CapturingRepository repository = new CapturingRepository(true);
        AuthSignupService service = new AuthSignupService(
                repository,
                rawPassword -> "argon2:" + rawPassword.length(),
                normalizedEmail -> new ProtectedEmail(
                        new byte[] {1},
                        new byte[] {2},
                        "local-dev-key",
                        normalizedEmail.getBytes(StandardCharsets.UTF_8)),
                CLOCK);

        assertThatThrownBy(() -> service.signup(
                        new SignupRequest("user@example.com", "password1234!", "cutan")))
                .isInstanceOf(EmailAlreadyExistsException.class);

        assertThat(repository.insertedUser).isNull();
        assertThat(repository.defaultPrivacyCreatedFor).isNull();
    }

    private static class CapturingRepository implements AuthUserRepository {

        private final boolean existing;
        private AuthUserRecord insertedUser;
        private UUID defaultPrivacyCreatedFor;

        private CapturingRepository(boolean existing) {
            this.existing = existing;
        }

        @Override
        public boolean existsActiveByEmailLookupHash(byte[] emailLookupHash) {
            return existing;
        }

        @Override
        public Optional<AuthLoginUser> findActiveLoginUserByEmailLookupHash(byte[] emailLookupHash) {
            return Optional.empty();
        }

        @Override
        public void insert(AuthUserRecord user) {
            insertedUser = copy(user);
        }

        @Override
        public void insertDefaultPrivacySettings(UUID userId) {
            defaultPrivacyCreatedFor = userId;
        }

        private AuthUserRecord copy(AuthUserRecord user) {
            return new AuthUserRecord(
                    user.id(),
                    Arrays.copyOf(user.emailCiphertext(), user.emailCiphertext().length),
                    Arrays.copyOf(user.emailNonce(), user.emailNonce().length),
                    user.emailKeyId(),
                    Arrays.copyOf(user.emailLookupHash(), user.emailLookupHash().length),
                    user.passwordHash(),
                    user.nickname(),
                    user.createdAt());
        }
    }
}
