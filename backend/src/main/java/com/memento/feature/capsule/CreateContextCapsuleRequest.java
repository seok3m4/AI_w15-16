package com.memento.feature.capsule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

record CreateContextCapsuleRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 2000) String purpose,
        @Size(max = 2000) String query,
        String scope,
        List<UUID> sourcePostIds) {
}
