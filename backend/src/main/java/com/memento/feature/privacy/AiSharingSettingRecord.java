package com.memento.feature.privacy;

import java.time.Instant;

record AiSharingSettingRecord(
        boolean friendAiSharingEnabled,
        Instant updatedAt) {
}
