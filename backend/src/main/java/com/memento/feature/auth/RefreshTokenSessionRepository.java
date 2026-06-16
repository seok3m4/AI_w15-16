package com.memento.feature.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface RefreshTokenSessionRepository {

    void insert(RefreshTokenSessionRecord session);

    Optional<RefreshTokenSessionRecord> findByTokenHash(byte[] tokenHash);

    boolean markRotated(UUID sessionId, Instant rotatedAt, Instant lastUsedAt);

    void revokeFamily(UUID sessionFamilyId, String revokedReason, Instant revokedAt);
}
