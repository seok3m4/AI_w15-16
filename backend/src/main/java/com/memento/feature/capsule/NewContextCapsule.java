package com.memento.feature.capsule;

import java.util.List;
import java.util.UUID;

record NewContextCapsule(
        UUID id,
        UUID ownerId,
        String title,
        String purpose,
        String query,
        String summary,
        List<String> keyFacts,
        List<String> tags,
        boolean containsFriendContext,
        List<ContextCapsuleSourceRecord> sources) {
}
