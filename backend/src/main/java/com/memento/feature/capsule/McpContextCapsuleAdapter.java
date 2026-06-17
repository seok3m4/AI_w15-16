package com.memento.feature.capsule;

import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
class McpContextCapsuleAdapter implements McpContextCapsulePort {

    private final ContextCapsuleQueryService queryService;

    McpContextCapsuleAdapter(ContextCapsuleQueryService queryService) {
        this.queryService = queryService;
    }

    @Override
    @Transactional(readOnly = true)
    public CompactContext getCompactContext(UUID ownerId, UUID capsuleId) {
        ContextCapsuleCompactContextResponse response = queryService.compactContext(ownerId, capsuleId);
        return new CompactContext(
                response.purpose(),
                response.summary(),
                response.keyFacts(),
                response.sourcePostIds(),
                response.tags());
    }
}

