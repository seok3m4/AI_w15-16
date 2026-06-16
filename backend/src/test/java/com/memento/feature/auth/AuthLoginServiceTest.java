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

class AuthLoginServiceTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-06-15T03:10:00Z"), ZoneOffset.UTC);
    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Test
    void loginIssuesAccessTokenAndStoresRefreshSessionWithoutRawToken() {
        CapturingRepository repository = CapturingRepository.withUser();
        AuthLoginService service = new AuthLoginService(
                repository,
                (rawPassword, encodedPassword) -> rawPassword.equals("password1234!"),
                normalizedEmail -> ("lookup:" + normalizedEmail).getBytes(StandardCharsets.UTF_8),
                new StubJwtTokenService(),
                new StubRefreshTokenHasher(),
                () -> "refresh-token-1",
                CLOCK);

        LoginResponse response = service.login(
                new LoginRequest(" USER@example.COM ", "password1234!"));

        assertThat(response.accessToken()).isEqualTo("access:" + USER_ID);
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(3600);
        assertThat(response.user().id()).isEqualTo(USER_ID);
        assertThat(response.user().email()).isEqualTo("user@example.com");

        assertThat(repository.lookupHash)
                .isEqualTo("lookup:user@example.com".getBytes(StandardCharsets.UTF_8));
        assertThat(repository.insertedRefreshSession).isNotNull();
        assertThat(repository.insertedRefreshSession.tokenHash())
                .isEqualTo("hash:refresh-token-1".getBytes(StandardCharsets.UTF_8));
        assertThat(repository.insertedRefreshSession.tokenHash())
                .isNotEqualTo("refresh-token-1".getBytes(StandardCharsets.UTF_8));
        assertThat(response.refreshCookie().value()).isEqualTo("refresh-token-1");
    }

    @Test
    void loginRejectsWrongPasswordWithoutCreatingRefreshSession() {
        CapturingRepository repository = CapturingRepository.withUser();
        AuthLoginService service = new AuthLoginService(
                repository,
                (rawPassword, encodedPassword) -> false,
                normalizedEmail -> normalizedEmail.getBytes(StandardCharsets.UTF_8),
                new StubJwtTokenService(),
                new StubRefreshTokenHasher(),
                () -> "refresh-token-1",
                CLOCK);

        assertThatThrownBy(() -> service.login(
                        new LoginRequest("user@example.com", "wrong-password")))
                .isInstanceOf(InvalidCredentialsException.class);

        assertThat(repository.insertedRefreshSession).isNull();
    }

    @Test
    void refreshRotatesStoredSessionAndReturnsNewTokens() {
        CapturingRepository repository = CapturingRepository.withRefreshSession();
        AuthLoginService service = new AuthLoginService(
                repository,
                (rawPassword, encodedPassword) -> true,
                normalizedEmail -> normalizedEmail.getBytes(StandardCharsets.UTF_8),
                new StubJwtTokenService(),
                new StubRefreshTokenHasher(),
                () -> "refresh-token-2",
                CLOCK);

        RefreshResponse response = service.refresh("refresh-token-1");

        assertThat(response.accessToken()).isEqualTo("access:" + USER_ID);
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(3600);
        assertThat(repository.rotatedSessionId)
                .isEqualTo(UUID.fromString("22222222-2222-2222-2222-222222222222"));
        assertThat(repository.insertedRefreshSession.rotatedFromHash())
                .isEqualTo("hash:refresh-token-1".getBytes(StandardCharsets.UTF_8));
        assertThat(response.refreshCookie().value()).isEqualTo("refresh-token-2");
    }

    @Test
    void refreshRejectsReusedTokenAndRevokesFamily() {
        CapturingRepository repository = CapturingRepository.withReusedRefreshSession();
        AuthLoginService service = new AuthLoginService(
                repository,
                (rawPassword, encodedPassword) -> true,
                normalizedEmail -> normalizedEmail.getBytes(StandardCharsets.UTF_8),
                new StubJwtTokenService(),
                new StubRefreshTokenHasher(),
                () -> "refresh-token-2",
                CLOCK);

        assertThatThrownBy(() -> service.refresh("refresh-token-1"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        assertThat(repository.revokedFamilyId)
                .isEqualTo(UUID.fromString("33333333-3333-3333-3333-333333333333"));
        assertThat(repository.revokedReason).isEqualTo("rotation_reuse");
    }

    @Test
    void refreshRejectsConcurrentReuseWhenRotationUpdateLosesRace() {
        CapturingRepository repository = CapturingRepository.withRefreshSession();
        repository.rotationUpdateShouldSucceed = false;
        AuthLoginService service = new AuthLoginService(
                repository,
                (rawPassword, encodedPassword) -> true,
                normalizedEmail -> normalizedEmail.getBytes(StandardCharsets.UTF_8),
                new StubJwtTokenService(),
                new StubRefreshTokenHasher(),
                () -> "refresh-token-2",
                CLOCK);

        assertThatThrownBy(() -> service.refresh("refresh-token-1"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        assertThat(repository.insertedRefreshSession).isNull();
        assertThat(repository.revokedFamilyId)
                .isEqualTo(UUID.fromString("33333333-3333-3333-3333-333333333333"));
        assertThat(repository.revokedReason).isEqualTo("rotation_reuse");
    }

    private static class CapturingRepository implements AuthUserRepository, RefreshTokenSessionRepository {

        private final Optional<AuthLoginUser> user;
        private final Optional<RefreshTokenSessionRecord> refreshSession;
        private byte[] lookupHash;
        private RefreshTokenSessionRecord insertedRefreshSession;
        private UUID rotatedSessionId;
        private UUID revokedFamilyId;
        private String revokedReason;
        private boolean rotationUpdateShouldSucceed = true;

        private CapturingRepository(
                Optional<AuthLoginUser> user,
                Optional<RefreshTokenSessionRecord> refreshSession) {
            this.user = user;
            this.refreshSession = refreshSession;
        }

        private static CapturingRepository withUser() {
            return new CapturingRepository(Optional.of(new AuthLoginUser(
                    USER_ID,
                    "argon2-hash",
                    "cutan",
                    false,
                    Instant.parse("2026-06-15T03:00:00Z"))), Optional.empty());
        }

        private static CapturingRepository withRefreshSession() {
            return new CapturingRepository(Optional.of(new AuthLoginUser(
                    USER_ID,
                    "argon2-hash",
                    "cutan",
                    false,
                    Instant.parse("2026-06-15T03:00:00Z"))), Optional.of(new RefreshTokenSessionRecord(
                    UUID.fromString("22222222-2222-2222-2222-222222222222"),
                    USER_ID,
                    UUID.fromString("33333333-3333-3333-3333-333333333333"),
                    "hash:refresh-token-1".getBytes(StandardCharsets.UTF_8),
                    null,
                    Instant.parse("2026-06-29T03:10:00Z"),
                    null,
                    null)));
        }

        private static CapturingRepository withReusedRefreshSession() {
            return new CapturingRepository(Optional.empty(), Optional.of(new RefreshTokenSessionRecord(
                    UUID.fromString("22222222-2222-2222-2222-222222222222"),
                    USER_ID,
                    UUID.fromString("33333333-3333-3333-3333-333333333333"),
                    "hash:refresh-token-1".getBytes(StandardCharsets.UTF_8),
                    null,
                    Instant.parse("2026-06-29T03:10:00Z"),
                    Instant.parse("2026-06-15T03:09:00Z"),
                    null)));
        }

        @Override
        public boolean existsActiveByEmailLookupHash(byte[] emailLookupHash) {
            return false;
        }

        @Override
        public Optional<AuthLoginUser> findActiveLoginUserByEmailLookupHash(byte[] emailLookupHash) {
            lookupHash = Arrays.copyOf(emailLookupHash, emailLookupHash.length);
            return user;
        }

        @Override
        public void insert(AuthUserRecord user) {
        }

        @Override
        public void insertDefaultPrivacySettings(UUID userId) {
        }

        @Override
        public void insert(RefreshTokenSessionRecord session) {
            insertedRefreshSession = session;
        }

        @Override
        public Optional<RefreshTokenSessionRecord> findByTokenHash(byte[] tokenHash) {
            return refreshSession;
        }

        @Override
        public boolean markRotated(UUID sessionId, Instant rotatedAt, Instant lastUsedAt) {
            rotatedSessionId = sessionId;
            return rotationUpdateShouldSucceed;
        }

        @Override
        public void revokeFamily(UUID sessionFamilyId, String revokedReason, Instant revokedAt) {
            revokedFamilyId = sessionFamilyId;
            this.revokedReason = revokedReason;
        }
    }

    private static class StubJwtTokenService implements JwtTokenService {

        @Override
        public String createAccessToken(UUID userId, Instant issuedAt) {
            return "access:" + userId;
        }

        @Override
        public long accessTokenExpiresInSeconds() {
            return 3600;
        }
    }

    private static class StubRefreshTokenHasher implements RefreshTokenHasher {

        @Override
        public byte[] hash(String rawToken) {
            return ("hash:" + rawToken).getBytes(StandardCharsets.UTF_8);
        }
    }
}
