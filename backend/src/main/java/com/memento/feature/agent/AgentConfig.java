package com.memento.feature.agent;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
class AgentConfig {

    @Bean
    @ConfigurationProperties("memento.agent")
    AgentProperties agentProperties() {
        return new AgentProperties();
    }

    @Bean
    RestTemplate agentRestTemplate(RestTemplateBuilder builder, AgentProperties properties) {
        return builder
                .connectTimeout(properties.getConnectTimeout())
                .readTimeout(properties.getReadTimeout())
                .build();
    }
}
