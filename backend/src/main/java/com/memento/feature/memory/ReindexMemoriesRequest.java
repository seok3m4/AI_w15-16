package com.memento.feature.memory;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

record ReindexMemoriesRequest(
        @NotEmpty List<UUID> postIds,
        String reason) {
}
