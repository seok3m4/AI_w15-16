package com.memento.feature.privacy;

import jakarta.validation.constraints.NotNull;

record AiSharingUpdateRequest(@NotNull Boolean enabled) {
}
