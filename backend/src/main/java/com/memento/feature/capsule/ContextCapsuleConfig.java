package com.memento.feature.capsule;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
class ContextCapsuleConfig {

    @Bean
    @ConfigurationProperties("memento.capsule")
    ContextCapsuleProperties contextCapsuleProperties() {
        return new ContextCapsuleProperties();
    }

    @Bean
    RestTemplate contextCapsuleRestTemplate(RestTemplateBuilder builder) {
        return builder.build();
    }
}
