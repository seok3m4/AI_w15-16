package com.memento.feature.capsule;

import java.util.List;
import java.util.UUID;

record ContextCapsuleCompactContextResponse(
        String purpose,
        String summary,
        List<String> keyFacts,
        List<UUID> sourcePostIds,
        List<String> tags) {

    static ContextCapsuleCompactContextResponse from(ContextCapsuleRecord record) {
        return new ContextCapsuleCompactContextResponse(
                record.purpose(),
                record.summary(),
                record.keyFacts(),
                record.sources().stream()
                        .map(ContextCapsuleSourceRecord::postId)
                        .toList(),
                record.tags());
    }
}
