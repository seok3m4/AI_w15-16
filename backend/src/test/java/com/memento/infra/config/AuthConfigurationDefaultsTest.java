package com.memento.infra.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class AuthConfigurationDefaultsTest {

    @Test
    void baseApplicationConfigRequiresAuthSecretsFromEnvironment() throws IOException {
        String applicationConfig = Files.readString(Path.of("src/main/resources/application.yml"));

        assertThat(applicationConfig)
                .contains("email-encryption-key-base64: ${EMAIL_ENCRYPTION_KEY_BASE64}")
                .contains("email-encryption-key-id: ${EMAIL_ENCRYPTION_KEY_ID}")
                .contains("email-lookup-pepper-base64: ${EMAIL_LOOKUP_PEPPER_BASE64}")
                .doesNotContain("EMAIL_ENCRYPTION_KEY_BASE64:")
                .doesNotContain("EMAIL_ENCRYPTION_KEY_ID:")
                .doesNotContain("EMAIL_LOOKUP_PEPPER_BASE64:")
                .doesNotContain("local-dev-key")
                .doesNotContain("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
                .doesNotContain("bG9jYWwtbG9va3VwLXBlcHBlcg==");
    }

    @Test
    void localApplicationConfigKeepsLocalOnlyAuthDefaults() throws IOException {
        String localConfig = Files.readString(Path.of("src/main/resources/application-local.yml"));

        assertThat(localConfig)
                .contains("email-encryption-key-base64: ${EMAIL_ENCRYPTION_KEY_BASE64:MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=}")
                .contains("email-encryption-key-id: ${EMAIL_ENCRYPTION_KEY_ID:local-dev-key}")
                .contains("email-lookup-pepper-base64: ${EMAIL_LOOKUP_PEPPER_BASE64:bG9jYWwtbG9va3VwLXBlcHBlcg==}");
    }
}
