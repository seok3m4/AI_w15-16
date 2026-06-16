package com.memento.feature.auth;

import java.time.Instant;
import java.util.UUID;

record UserPrivateRecord(
        UUID id,
        byte[] emailCiphertext,
        byte[] emailNonce,
        String nickname,
        boolean friendAiSharingEnabled,
        Instant createdAt) {
}
