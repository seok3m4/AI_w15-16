package com.memento.feature.memory;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
class FastApiMemorySummaryClient {

    private static final String MEMORY_SUMMARIES_PATH = "/internal/v1/memory-summaries";

    private final RestTemplate memorySummaryRestTemplate;
    private final MemorySummaryProperties properties;

    FastApiMemorySummaryClient(
            @Qualifier("memorySummaryRestTemplate") RestTemplate memorySummaryRestTemplate,
            MemorySummaryProperties properties) {
        this.memorySummaryRestTemplate = memorySummaryRestTemplate;
        this.properties = properties;
    }

    FastApiMemorySummaryResponse summarize(FastApiMemorySummaryRequest request) {
        try {
            FastApiMemorySummaryResponse response = memorySummaryRestTemplate.postForObject(
                    url(),
                    request,
                    FastApiMemorySummaryResponse.class);
            if (response == null) {
                throw new MemorySummaryProviderException();
            }
            return response;
        } catch (ResourceAccessException exception) {
            throw new MemorySummaryTimeoutException(exception);
        } catch (RestClientException exception) {
            throw new MemorySummaryProviderException(exception);
        }
    }

    private String url() {
        String baseUrl = properties.getBaseUrl();
        if (baseUrl.endsWith("/")) {
            return baseUrl.substring(0, baseUrl.length() - 1) + MEMORY_SUMMARIES_PATH;
        }
        return baseUrl + MEMORY_SUMMARIES_PATH;
    }
}
