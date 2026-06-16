package com.memento.feature.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;

record RefreshResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        @JsonIgnore RefreshCookie refreshCookie) {
}
