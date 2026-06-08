package com.week15.board.ai.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
        boolean enabled,
        Rag rag,
        Agent agent,
        Mcp mcp
) {

    public record Rag(int topK, String embeddingModel, String vectorStore) {
    }

    public record Agent(String provider, String model) {
    }

    public record Mcp(List<String> servers) {
    }
}

