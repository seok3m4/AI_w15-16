package com.memento.feature.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
class AuthTokenProperties {

    private final long accessTokenTtlSeconds;
    private final long refreshTokenTtlSeconds;
    private final boolean refreshCookieSecure;

    AuthTokenProperties(
            @Value("${memento.auth.access-token-ttl-seconds:3600}") long accessTokenTtlSeconds,
            @Value("${memento.auth.refresh-token-ttl-seconds:1209600}") long refreshTokenTtlSeconds,
            @Value("${COOKIE_SECURE:false}") boolean refreshCookieSecure) {
        this.accessTokenTtlSeconds = accessTokenTtlSeconds;
        this.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
        this.refreshCookieSecure = refreshCookieSecure;
    }

    static AuthTokenProperties localDefaults() {
        return new AuthTokenProperties(3600, 1_209_600, false);
    }

    long accessTokenTtlSeconds() {
        return accessTokenTtlSeconds;
    }

    long refreshTokenTtlSeconds() {
        return refreshTokenTtlSeconds;
    }

    boolean refreshCookieSecure() {
        return refreshCookieSecure;
    }
}
