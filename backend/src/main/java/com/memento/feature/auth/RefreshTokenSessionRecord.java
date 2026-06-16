package com.memento.feature.auth;

import java.time.Instant;
import java.util.UUID;

record RefreshTokenSessionRecord(
        UUID id,
        UUID userId,
        UUID sessionFamilyId,
        byte[] tokenHash,
        byte[] rotatedFromHash,
        Instant expiresAt,
        Instant rotatedAt,
        Instant revokedAt) {

    boolean isActiveAt(Instant now) {
        return revokedAt == null
                && rotatedAt == null
                && expiresAt.isAfter(now);
    }
}
