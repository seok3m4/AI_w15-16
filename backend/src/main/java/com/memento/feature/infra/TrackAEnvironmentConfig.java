package com.memento.feature.infra;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TrackAEnvironmentConfig {

    @Bean
    TrackAEnvironment trackAEnvironment(
            @Value("${DATABASE_URL:jdbc:postgresql://postgres:5432/memento}") String databaseUrl,
            @Value("${DATABASE_USERNAME:memento}") String databaseUsername,
            @Value("${DATABASE_PASSWORD:memento_local_password}") String databasePassword,
            @Value("${AI_SERVER_URL:http://ai-server:8000}") String aiServerUrl,
            @Value("${JWT_SIGNING_KEY:local-dev-only-change-me}") String jwtSigningKey,
            @Value("${REFRESH_TOKEN_PEPPER:local-dev-only-change-me}") String refreshTokenPepper,
            @Value("${FRONTEND_ORIGIN:http://localhost:5173}") String frontendOrigin,
            @Value("${COOKIE_SECURE:false}") boolean cookieSecure) {
        return new TrackAEnvironment(
                databaseUrl,
                databaseUsername,
                databasePassword,
                aiServerUrl,
                jwtSigningKey,
                refreshTokenPepper,
                frontendOrigin,
                cookieSecure);
    }
}
