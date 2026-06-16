package com.memento.feature.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;

record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        AuthenticatedUserResponse user,
        @JsonIgnore RefreshCookie refreshCookie) {
}
