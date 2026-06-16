package com.memento.feature.auth;

record RefreshCookie(
        String value,
        long maxAgeSeconds,
        boolean secure) {

    static RefreshCookie from(String value, AuthTokenProperties tokenProperties) {
        return new RefreshCookie(
                value,
                tokenProperties.refreshTokenTtlSeconds(),
                tokenProperties.refreshCookieSecure());
    }
}
