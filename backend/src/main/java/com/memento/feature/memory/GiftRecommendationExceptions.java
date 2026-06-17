package com.memento.feature.memory;

class FriendAiContextNotAllowedException extends RuntimeException {
}

class GiftRecommendationProviderException extends RuntimeException {

    GiftRecommendationProviderException() {
        super("Gift recommendation provider unavailable.");
    }

    GiftRecommendationProviderException(Throwable cause) {
        super("Gift recommendation provider unavailable.", cause);
    }
}

class GiftRecommendationTimeoutException extends RuntimeException {

    GiftRecommendationTimeoutException(Throwable cause) {
        super("Gift recommendation provider timed out.", cause);
    }
}
