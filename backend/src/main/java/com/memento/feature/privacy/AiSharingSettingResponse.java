package com.memento.feature.privacy;

import java.time.Instant;

public record AiSharingSettingResponse(
        boolean friendAiSharingEnabled,
        Instant updatedAt) {
}
