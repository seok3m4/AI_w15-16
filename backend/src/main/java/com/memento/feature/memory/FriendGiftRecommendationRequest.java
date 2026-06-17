package com.memento.feature.memory;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

record FriendGiftRecommendationRequest(
        @Size(max = 80) String occasion,
        @Valid GiftBudgetRequest budget,
        @Size(max = 2000) String preferences,
        @Min(1) @Max(20) Integer maxSources) {
}

record GiftBudgetRequest(
        @Min(0) Integer min,
        @Min(0) Integer max,
        @Size(max = 12) String currency) {
}
