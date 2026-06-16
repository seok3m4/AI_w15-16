package com.memento.feature.capsule;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
class RestFastApiContextCapsuleClient implements FastApiContextCapsuleClient {

    private static final String CAPSULE_DRAFT_PATH = "/internal/v1/context-capsule-drafts";

    private final RestTemplate restTemplate;
    private final ContextCapsuleProperties properties;

    RestFastApiContextCapsuleClient(RestTemplate restTemplate, ContextCapsuleProperties properties) {
        this.restTemplate = restTemplate;
        this.properties = properties;
    }

    @Override
    public ContextCapsuleDraftResponse createDraft(ContextCapsuleDraftRequest request) {
        try {
            ContextCapsuleDraftResponse response =
                    restTemplate.postForObject(url(), request, ContextCapsuleDraftResponse.class);
            if (response == null) {
                throw new ContextCapsuleDraftFailedException();
            }
            return response;
        } catch (RestClientException exception) {
            throw new ContextCapsuleDraftFailedException();
        }
    }

    private String url() {
        String baseUrl = properties.getBaseUrl();
        if (baseUrl.endsWith("/")) {
            return baseUrl.substring(0, baseUrl.length() - 1) + CAPSULE_DRAFT_PATH;
        }
        return baseUrl + CAPSULE_DRAFT_PATH;
    }
}
