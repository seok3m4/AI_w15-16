package com.memento.feature.memory;

import java.util.UUID;

record PostMemorySourceRow(
        UUID postId,
        UUID ownerId,
        String title,
        String content,
        UUID tagId,
        String tagName) {
}
