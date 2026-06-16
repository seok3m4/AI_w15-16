package com.memento.feature.auth;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthLoginService {

    private static final String ROTATION_REUSE_REASON = "rotation_reuse";
    private static final String LOGOUT_REASON = "logout";

    private final AuthUserRepository userRepository;
    private final PasswordVerifier passwordVerifier;
    private final EmailLookupHasher emailLookupHasher;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenHasher refreshTokenHasher;
    private final Supplier<String> refreshTokenSupplier;
    private final RefreshTokenSessionRepository refreshTokenSessionRepository;
    private final Clock clock;
    private final AuthTokenProperties tokenProperties;

    @Autowired
    AuthLoginService(
            AuthUserRepository userRepository,
            PasswordVerifier passwordVerifier,
            EmailLookupHasher emailLookupHasher,
            JwtTokenService jwtTokenService,
            RefreshTokenHasher refreshTokenHasher,
            Supplier<String> refreshTokenSupplier,
            RefreshTokenSessionRepository refreshTokenSessionRepository,
            Clock clock,
            AuthTokenProperties tokenProperties) {
        this.userRepository = userRepository;
        this.passwordVerifier = passwordVerifier;
        this.emailLookupHasher = emailLookupHasher;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenHasher = refreshTokenHasher;
        this.refreshTokenSupplier = refreshTokenSupplier;
        this.refreshTokenSessionRepository = refreshTokenSessionRepository;
        this.clock = clock;
        this.tokenProperties = tokenProperties;
    }

    AuthLoginService(
            AuthUserRepository userRepository,
            PasswordVerifier passwordVerifier,
            EmailLookupHasher emailLookupHasher,
            JwtTokenService jwtTokenService,
            RefreshTokenHasher refreshTokenHasher,
            Supplier<String> refreshTokenSupplier,
            Clock clock) {
        this(
                userRepository,
                passwordVerifier,
                emailLookupHasher,
                jwtTokenService,
                refreshTokenHasher,
                refreshTokenSupplier,
                (RefreshTokenSessionRepository) userRepository,
                clock,
                AuthTokenProperties.localDefaults());
    }

    @Transactional
    LoginResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        AuthLoginUser user = userRepository.findActiveLoginUserByEmailLookupHash(
                        emailLookupHasher.lookupHash(normalizedEmail))
                .filter(candidate -> passwordVerifier.matches(request.password(), candidate.passwordHash()))
                .orElseThrow(InvalidCredentialsException::new);

        Instant now = clock.instant();
        String accessToken = jwtTokenService.createAccessToken(user.id(), now);
        String refreshToken = refreshTokenSupplier.get();
        byte[] refreshTokenHash = refreshTokenHasher.hash(refreshToken);
        refreshTokenSessionRepository.insert(new RefreshTokenSessionRecord(
                UUID.randomUUID(),
                user.id(),
                UUID.randomUUID(),
                refreshTokenHash,
                null,
                now.plus(tokenProperties.refreshTokenTtlSeconds(), ChronoUnit.SECONDS),
                null,
                null));

        return new LoginResponse(
                accessToken,
                "Bearer",
                jwtTokenService.accessTokenExpiresInSeconds(),
                new AuthenticatedUserResponse(user.id(), normalizedEmail, user.nickname()),
                RefreshCookie.from(refreshToken, tokenProperties));
    }

    @Transactional
    RefreshResponse refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new InvalidRefreshTokenException();
        }

        Instant now = clock.instant();
        byte[] refreshTokenHash = refreshTokenHasher.hash(rawRefreshToken);
        RefreshTokenSessionRecord session = refreshTokenSessionRepository.findByTokenHash(refreshTokenHash)
                .orElseThrow(InvalidRefreshTokenException::new);
        if (!session.isActiveAt(now)) {
            if (session.rotatedAt() != null) {
                refreshTokenSessionRepository.revokeFamily(
                        session.sessionFamilyId(),
                        ROTATION_REUSE_REASON,
                        now);
            }
            throw new InvalidRefreshTokenException();
        }

        boolean rotated = refreshTokenSessionRepository.markRotated(session.id(), now, now);
        if (!rotated) {
            refreshTokenSessionRepository.revokeFamily(
                    session.sessionFamilyId(),
                    ROTATION_REUSE_REASON,
                    now);
            throw new InvalidRefreshTokenException();
        }
        String newRefreshToken = refreshTokenSupplier.get();
        refreshTokenSessionRepository.insert(new RefreshTokenSessionRecord(
                UUID.randomUUID(),
                session.userId(),
                session.sessionFamilyId(),
                refreshTokenHasher.hash(newRefreshToken),
                refreshTokenHash,
                now.plus(tokenProperties.refreshTokenTtlSeconds(), ChronoUnit.SECONDS),
                null,
                null));

        return new RefreshResponse(
                jwtTokenService.createAccessToken(session.userId(), now),
                "Bearer",
                jwtTokenService.accessTokenExpiresInSeconds(),
                RefreshCookie.from(newRefreshToken, tokenProperties));
    }

    @Transactional
    void logout(UUID userId, String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }

        Instant now = clock.instant();
        byte[] refreshTokenHash = refreshTokenHasher.hash(rawRefreshToken);
        refreshTokenSessionRepository.findByTokenHash(refreshTokenHash)
                .filter(session -> session.userId().equals(userId))
                .ifPresent(session -> refreshTokenSessionRepository.revokeFamily(
                        session.sessionFamilyId(),
                        LOGOUT_REASON,
                        now));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
