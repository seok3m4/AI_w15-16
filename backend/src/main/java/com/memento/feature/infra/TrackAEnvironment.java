package com.memento.feature.infra;

public record TrackAEnvironment(
        String databaseUrl,
        String databaseUsername,
        String databasePassword,
        String aiServerUrl,
        String jwtSigningKey,
        String refreshTokenPepper,
        String frontendOrigin,
        boolean cookieSecure) {}
