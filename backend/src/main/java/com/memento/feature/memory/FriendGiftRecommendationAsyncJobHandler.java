package com.memento.feature.memory;

import com.fasterxml.jackson.databind.JsonNode;
import com.memento.feature.jobs.AsyncJobHandler;
import com.memento.feature.jobs.AsyncJobRetryableException;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.jobs.ClaimedAsyncJob;
import org.springframework.stereotype.Component;

@Component
class FriendGiftRecommendationAsyncJobHandler implements AsyncJobHandler {

    private final FriendGiftRecommendationService service;

    FriendGiftRecommendationAsyncJobHandler(FriendGiftRecommendationService service) {
        this.service = service;
    }

    @Override
    public AsyncJobType type() {
        return AsyncJobType.GIFT_RECOMMENDATION;
    }

    @Override
    public JsonNode handle(ClaimedAsyncJob job) {
        try {
            return service.handleJob(job);
        } catch (GiftRecommendationTimeoutException exception) {
            throw new AsyncJobRetryableException("Gift recommendation provider is temporarily unavailable.");
        }
    }
}
