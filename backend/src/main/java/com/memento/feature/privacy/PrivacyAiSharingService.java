package com.memento.feature.privacy;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PrivacyAiSharingService {

    private final PrivacySettingRepository privacySettingRepository;
    private final Clock clock;

    PrivacyAiSharingService(PrivacySettingRepository privacySettingRepository, Clock clock) {
        this.privacySettingRepository = privacySettingRepository;
        this.clock = clock;
    }

    @Transactional
    public AiSharingSettingResponse updateAiSharing(UUID userId, boolean enabled) {
        Instant updatedAt = clock.instant();
        AiSharingSettingRecord setting = privacySettingRepository.updateAiSharing(userId, enabled, updatedAt)
                .orElseThrow(PrivacyUnauthorizedException::new);
        return new AiSharingSettingResponse(setting.friendAiSharingEnabled(), setting.updatedAt());
    }
}
