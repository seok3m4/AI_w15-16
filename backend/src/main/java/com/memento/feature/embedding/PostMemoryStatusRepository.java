package com.memento.feature.embedding;

import java.util.UUID;

interface PostMemoryStatusRepository {

    void markRunning(UUID postId, UUID ownerId);

    void markSucceeded(UUID postId, UUID ownerId);

    void markFailed(UUID postId, UUID ownerId);
}
