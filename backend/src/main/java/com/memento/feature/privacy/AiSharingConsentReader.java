package com.memento.feature.privacy;

import java.util.UUID;

public interface AiSharingConsentReader {

    boolean isFriendAiSharingEnabled(UUID userId);
}
