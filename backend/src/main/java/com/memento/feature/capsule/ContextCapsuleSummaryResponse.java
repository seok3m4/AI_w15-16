package com.memento.feature.capsule;

import java.time.Instant;
import java.util.UUID;

record ContextCapsuleSummaryResponse(
        UUID id,
        String title,
        String purpose,
        boolean containsFriendContext,
        Instant createdAt,
        Instant updatedAt) {

    static ContextCapsuleSummaryResponse from(ContextCapsuleRecord record) {
        return new ContextCapsuleSummaryResponse(
                record.id(),
                record.title(),
                record.purpose(),
                record.containsFriendContext(),
                record.createdAt(),
                record.updatedAt());
    }
}

