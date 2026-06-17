package com.memento.feature.memory;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;

record MemorySummaryRequest(
        @NotBlank(message = "query must not be blank.")
        String query,
        String scope,
        List<UUID> sourcePostIds,
        @Min(value = 1, message = "maxSources must be at least 1.")
        @Max(value = 20, message = "maxSources must be at most 20.")
        Integer maxSources) {
}
