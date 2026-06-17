package com.memento.feature.memory;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
class FastApiFriendGiftRecommendationClient {

    private static final String GIFT_RECOMMENDATIONS_PATH = "/internal/v1/friend-gift-recommendations";

    private final RestTemplate memorySummaryRestTemplate;
    private final MemorySummaryProperties properties;

    FastApiFriendGiftRecommendationClient(
            @Qualifier("memorySummaryRestTemplate") RestTemplate memorySummaryRestTemplate,
            MemorySummaryProperties properties) {
        this.memorySummaryRestTemplate = memorySummaryRestTemplate;
        this.properties = properties;
    }

    FastApiFriendGiftRecommendationResponse recommend(FastApiFriendGiftRecommendationRequest request) {
        try {
            FastApiFriendGiftRecommendationResponse response = memorySummaryRestTemplate.postForObject(
                    url(),
                    request,
                    FastApiFriendGiftRecommendationResponse.class);
            if (response == null) {
                throw new GiftRecommendationProviderException();
            }
            return response;
        } catch (ResourceAccessException exception) {
            throw new GiftRecommendationTimeoutException(exception);
        } catch (RestClientException exception) {
            throw new GiftRecommendationProviderException(exception);
        }
    }

    private String url() {
        String baseUrl = properties.getBaseUrl();
        if (baseUrl.endsWith("/")) {
            return baseUrl.substring(0, baseUrl.length() - 1) + GIFT_RECOMMENDATIONS_PATH;
        }
        return baseUrl + GIFT_RECOMMENDATIONS_PATH;
    }
}
