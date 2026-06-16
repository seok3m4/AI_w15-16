package com.memento.feature.auth;

import java.time.Instant;
import java.util.UUID;

record AuthUserRecord(
        UUID id,
        byte[] emailCiphertext,
        byte[] emailNonce,
        String emailKeyId,
        byte[] emailLookupHash,
        String passwordHash,
        String nickname,
        Instant createdAt) {
}
