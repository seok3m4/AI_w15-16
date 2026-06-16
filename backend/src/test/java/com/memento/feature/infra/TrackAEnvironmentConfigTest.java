package com.memento.feature.infra;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class TrackAEnvironmentConfigTest {

    private final ApplicationContextRunner contextRunner =
            new ApplicationContextRunner().withUserConfiguration(TrackAEnvironmentConfig.class);

    @Test
    void loadsTrackAEnvironmentVariables() {
        contextRunner
                .withPropertyValues(
                        "DATABASE_URL=jdbc:postgresql://postgres:5432/memento",
                        "DATABASE_USERNAME=memento",
                        "DATABASE_PASSWORD=memento_local_password",
                        "AI_SERVER_URL=http://ai-server:8000",
                        "JWT_SIGNING_KEY=local-dev-only-change-me",
                        "REFRESH_TOKEN_PEPPER=local-dev-only-change-me",
                        "FRONTEND_ORIGIN=http://localhost:5173",
                        "COOKIE_SECURE=false")
                .run(context -> {
                    TrackAEnvironment environment = context.getBean(TrackAEnvironment.class);

                    assertThat(environment.databaseUrl())
                            .isEqualTo("jdbc:postgresql://postgres:5432/memento");
                    assertThat(environment.databaseUsername()).isEqualTo("memento");
                    assertThat(environment.databasePassword()).isEqualTo("memento_local_password");
                    assertThat(environment.aiServerUrl()).isEqualTo("http://ai-server:8000");
                    assertThat(environment.jwtSigningKey()).isEqualTo("local-dev-only-change-me");
                    assertThat(environment.refreshTokenPepper()).isEqualTo("local-dev-only-change-me");
                    assertThat(environment.frontendOrigin()).isEqualTo("http://localhost:5173");
                    assertThat(environment.cookieSecure()).isFalse();
                });
    }

    @Test
    void usesLocalDefaultsWhenEnvironmentVariablesAreMissing() {
        contextRunner.run(context -> {
            TrackAEnvironment environment = context.getBean(TrackAEnvironment.class);

            assertThat(environment.databaseUrl())
                    .isEqualTo("jdbc:postgresql://postgres:5432/memento");
            assertThat(environment.databaseUsername()).isEqualTo("memento");
            assertThat(environment.databasePassword()).isEqualTo("memento_local_password");
            assertThat(environment.aiServerUrl()).isEqualTo("http://ai-server:8000");
            assertThat(environment.frontendOrigin()).isEqualTo("http://localhost:5173");
            assertThat(environment.cookieSecure()).isFalse();
        });
    }
}
