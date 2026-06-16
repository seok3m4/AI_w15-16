package com.memento.feature.privacy;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/privacy")
public class PrivacyController {

    private final PrivacyAiSharingService privacyAiSharingService;

    PrivacyController(PrivacyAiSharingService privacyAiSharingService) {
        this.privacyAiSharingService = privacyAiSharingService;
    }

    @PutMapping("/ai-sharing")
    AiSharingSettingResponse updateAiSharing(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @Valid @RequestBody AiSharingUpdateRequest request) {
        return privacyAiSharingService.updateAiSharing(currentUser.userId(), request.enabled());
    }
}
