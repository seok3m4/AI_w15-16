package com.memento.feature.auth;

import java.time.Instant;
import java.util.UUID;

record UserPrivateResponse(
        UUID id,
        String email,
        String nickname,
        boolean friendAiSharingEnabled,
        Instant createdAt) {
}
