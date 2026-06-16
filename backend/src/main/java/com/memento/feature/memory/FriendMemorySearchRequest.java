package com.memento.feature.memory;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record FriendMemorySearchRequest(
        @NotBlank @Size(max = 2000) String query,
        @Min(1) @Max(100) Integer limit) {
}

