package com.memento.feature.capsule;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class ContextCapsuleConfig {

    @Bean
    @ConfigurationProperties("memento.capsule")
    ContextCapsuleProperties contextCapsuleProperties() {
        return new ContextCapsuleProperties();
    }
}
