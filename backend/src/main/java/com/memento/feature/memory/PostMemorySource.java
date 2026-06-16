package com.memento.feature.memory;

import java.util.List;
import java.util.UUID;

record PostMemorySource(
        UUID postId,
        UUID ownerId,
        String title,
        String content,
        List<PostMemoryTagSource> tags) {
}
