package com.memento.feature.memory;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
class MemorySummaryConfig {

    @Bean
    @ConfigurationProperties("memento.summary")
    MemorySummaryProperties memorySummaryProperties() {
        return new MemorySummaryProperties();
    }

    @Bean
    RestTemplate memorySummaryRestTemplate(RestTemplateBuilder builder, MemorySummaryProperties properties) {
        return builder
                .connectTimeout(properties.getConnectTimeout())
                .readTimeout(properties.getReadTimeout())
                .build();
    }
}
