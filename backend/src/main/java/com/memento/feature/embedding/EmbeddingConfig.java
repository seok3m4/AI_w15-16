package com.memento.feature.embedding;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
class EmbeddingConfig {

    @Bean
    @ConfigurationProperties("memento.embedding")
    EmbeddingProperties embeddingProperties() {
        return new EmbeddingProperties();
    }

    @Bean
    RestTemplate embeddingRestTemplate(RestTemplateBuilder builder, EmbeddingProperties properties) {
        return builder
                .connectTimeout(properties.getConnectTimeout())
                .readTimeout(properties.getReadTimeout())
                .build();
    }
}
