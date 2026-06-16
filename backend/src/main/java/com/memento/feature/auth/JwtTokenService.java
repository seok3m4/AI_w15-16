package com.memento.feature.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface JwtTokenService {

    String createAccessToken(UUID userId, Instant issuedAt);

    Optional<AccessTokenClaims> verifyAccessToken(String token, Instant now);

    long accessTokenExpiresInSeconds();
}
