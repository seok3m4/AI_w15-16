package com.memento.feature.memory;

import java.util.List;
import java.util.UUID;

record FastApiFriendGiftRecommendationResponse(
        String provider,
        String model,
        UUID friendId,
        String occasion,
        String answer,
        List<FastApiGiftRecommendationItem> recommendations,
        List<FastApiGiftRecommendationSource> sources) {
}

record FastApiGiftRecommendationItem(
        String title,
        String reason,
        String confidence) {
}

record FastApiGiftRecommendationSource(
        UUID ownerUserId,
        String ownerNickname,
        UUID postId,
        String title,
        String sourceType,
        String summary) {
}
