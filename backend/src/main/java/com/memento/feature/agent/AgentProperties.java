package com.memento.feature.agent;

import java.time.Duration;

class AgentProperties {

    private String baseUrl = "http://ai-server:8000";
    private Duration connectTimeout = Duration.ofSeconds(2);
    private Duration readTimeout = Duration.ofSeconds(60);

    String getBaseUrl() {
        return baseUrl;
    }

    void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    Duration getConnectTimeout() {
        return connectTimeout;
    }

    void setConnectTimeout(Duration connectTimeout) {
        this.connectTimeout = connectTimeout;
    }

    Duration getReadTimeout() {
        return readTimeout;
    }

    void setReadTimeout(Duration readTimeout) {
        this.readTimeout = readTimeout;
    }
}
