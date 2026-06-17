package com.memento.feature.memory;

import java.util.List;
import java.util.UUID;

record FriendGiftRecommendationResponse(
        UUID friendId,
        String occasion,
        String answer,
        List<GiftRecommendationItemResponse> recommendations,
        List<GiftRecommendationSourceResponse> sources) {

    static FriendGiftRecommendationResponse from(
            UUID friendId,
            String occasion,
            FastApiFriendGiftRecommendationResponse response) {
        return new FriendGiftRecommendationResponse(
                friendId,
                occasion,
                response.answer(),
                safeRecommendations(response.recommendations()),
                safeSources(response.sources()));
    }

    private static List<GiftRecommendationItemResponse> safeRecommendations(
            List<FastApiGiftRecommendationItem> recommendations) {
        return recommendations == null
                ? List.of()
                : recommendations.stream()
                        .map(item -> new GiftRecommendationItemResponse(
                                item.title(),
                                item.reason(),
                                item.confidence()))
                        .toList();
    }

    private static List<GiftRecommendationSourceResponse> safeSources(
            List<FastApiGiftRecommendationSource> sources) {
        return sources == null
                ? List.of()
                : sources.stream()
                        .map(source -> new GiftRecommendationSourceResponse(
                                source.ownerUserId(),
                                source.ownerNickname(),
                                source.postId(),
                                source.title(),
                                source.sourceType(),
                                source.summary()))
                        .toList();
    }
}

record GiftRecommendationItemResponse(
        String title,
        String reason,
        String confidence) {
}

record GiftRecommendationSourceResponse(
        UUID ownerUserId,
        String ownerNickname,
        UUID postId,
        String title,
        String sourceType,
        String summary) {
}
