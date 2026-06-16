package com.memento.feature.auth;

import java.util.UUID;

record AuthenticatedUserResponse(
        UUID id,
        String email,
        String nickname) {
}
