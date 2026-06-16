package com.memento.feature.jobs;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
class AsyncJobConfig {

    @Bean
    @ConfigurationProperties("memento.jobs.worker")
    AsyncJobWorkerProperties asyncJobWorkerProperties() {
        return new AsyncJobWorkerProperties();
    }
}
