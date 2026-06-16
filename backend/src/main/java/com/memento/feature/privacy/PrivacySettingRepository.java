package com.memento.feature.privacy;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface PrivacySettingRepository extends AiSharingConsentReader {

    Optional<AiSharingSettingRecord> updateAiSharing(UUID userId, boolean enabled, Instant updatedAt);
}
