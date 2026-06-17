package com.memento.feature.embedding;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.client.RestTemplate;

@Component
class FastApiEmbeddingClient {

    private static final String EMBEDDINGS_PATH = "/internal/v1/embeddings";

    private final RestTemplate restTemplate;
    private final EmbeddingProperties properties;

    FastApiEmbeddingClient(@Qualifier("embeddingRestTemplate") RestTemplate restTemplate, EmbeddingProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }

    EmbeddingResponse createEmbeddings(EmbeddingRequest request) {
        EmbeddingResponse response = restTemplate.postForObject(url(), request, EmbeddingResponse.class);
        if (response == null) {
            throw new IllegalStateException("FastAPI embedding response was empty.");
        }
        return response;
    }

    private String url() {
        String baseUrl = properties.getBaseUrl();
        if (baseUrl.endsWith("/")) {
            return baseUrl.substring(0, baseUrl.length() - 1) + EMBEDDINGS_PATH;
        }
        return baseUrl + EMBEDDINGS_PATH;
    }
}
