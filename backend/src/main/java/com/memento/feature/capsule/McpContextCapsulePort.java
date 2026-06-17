package com.memento.feature.capsule;

import java.util.List;
import java.util.UUID;

public interface McpContextCapsulePort {

    CompactContext getCompactContext(UUID ownerId, UUID capsuleId);

    record CompactContext(
            String purpose,
            String summary,
            List<String> keyFacts,
            List<UUID> sourcePostIds,
            List<String> tags) {
    }
}

