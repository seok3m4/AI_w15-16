package com.memento.feature.auth;

import java.time.Instant;
import java.util.UUID;

interface JwtTokenService {

    String createAccessToken(UUID userId, Instant issuedAt);

    long accessTokenExpiresInSeconds();
}
