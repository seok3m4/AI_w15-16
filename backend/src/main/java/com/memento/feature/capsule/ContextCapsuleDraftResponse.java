package com.memento.feature.capsule;

import java.util.List;

record ContextCapsuleDraftResponse(
        String provider,
        String model,
        String purpose,
        String query,
        String summary,
        List<String> keyFacts,
        List<String> tags,
        boolean usedFriendContext,
        ContextCapsuleUsage usage) {
}
