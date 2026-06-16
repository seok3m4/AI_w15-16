package com.memento.feature.auth;

import java.util.UUID;

public record AuthenticatedUserPrincipal(UUID userId) {

    public static final String REQUEST_ATTRIBUTE = AuthenticatedUserPrincipal.class.getName();
}
