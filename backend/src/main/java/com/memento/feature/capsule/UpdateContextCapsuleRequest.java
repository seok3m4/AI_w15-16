package com.memento.feature.capsule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record UpdateContextCapsuleRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 2000) String purpose) {
}

