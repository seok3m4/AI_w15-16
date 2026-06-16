package com.memento.feature.auth;

import java.util.UUID;

record AuthenticatedUserPrincipal(UUID userId) {

    static final String REQUEST_ATTRIBUTE = AuthenticatedUserPrincipal.class.getName();
}
