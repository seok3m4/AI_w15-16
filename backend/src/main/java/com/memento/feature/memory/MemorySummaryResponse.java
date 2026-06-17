package com.memento.feature.memory;

import java.util.List;
import java.util.UUID;

record MemorySummaryResponse(
        String query,
        String answer,
        boolean usedFriendContext,
        List<MemorySummarySourceResponse> sources) {
}

record MemorySummarySourceResponse(
        UUID ownerUserId,
        String ownerNickname,
        UUID postId,
        String title,
        String sourceType,
        String summary) {
}
