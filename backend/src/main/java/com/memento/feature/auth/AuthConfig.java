package com.memento.feature.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class AuthConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    BearerAccessTokenFilter bearerAccessTokenFilter(
            JwtTokenService jwtTokenService,
            Clock clock,
            ObjectMapper objectMapper) {
        return new BearerAccessTokenFilter(jwtTokenService, clock, objectMapper);
    }
}
