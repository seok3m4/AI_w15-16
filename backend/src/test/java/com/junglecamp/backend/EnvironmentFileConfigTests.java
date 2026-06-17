package com.junglecamp.backend;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class EnvironmentFileConfigTests {

	@Test
	void backendImportsRootEnvLocalForRuntimeSecrets() throws IOException {
		Properties properties = new Properties();
		try (var reader = Files.newBufferedReader(Path.of("src/main/resources/application.properties"))) {
			properties.load(reader);
		}

		String imports = properties.getProperty("spring.config.import", "");

		assertThat(imports)
				.contains("optional:file:.env.local[.properties]")
				.contains("optional:file:../.env.local[.properties]");
	}

	@Test
	void backendIncludesSpringBootFlywayAutoConfigurationModule() throws IOException {
		String pomXml = Files.readString(Path.of("pom.xml"));

		assertThat(pomXml).contains("<artifactId>spring-boot-flyway</artifactId>");
	}

	@Test
	void googleOauthCallbackDefaultUsesRequestBaseUrlForDeploymentsBehindProxies() throws IOException {
		Properties properties = new Properties();
		try (var reader = Files.newBufferedReader(Path.of("src/main/resources/application.properties"))) {
			properties.load(reader);
		}

		String redirectUri = properties.getProperty("spring.security.oauth2.client.registration.google.redirect-uri", "");

		assertThat(redirectUri)
				.isEqualTo("${GOOGLE_REDIRECT_URI:{baseUrl}/login/oauth2/code/{registrationId}}")
				.doesNotContain("localhost:8080")
				.doesNotContain("localhost:5173");
	}
}
