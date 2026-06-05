package com.junglecamp.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

	@Bean
	OpenAPI jungleAiOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("Jungle AI Backend API")
						.description("Backend APIs for the Jungle AI board service.")
						.version("0.1.0"));
	}
}
