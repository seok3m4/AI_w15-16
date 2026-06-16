package com.memento.feature.auth;

import java.time.Instant;
import java.util.UUID;

record AuthLoginUser(
        UUID id,
        String passwordHash,
        String nickname,
        boolean friendAiSharingEnabled,
        Instant createdAt) {
}
