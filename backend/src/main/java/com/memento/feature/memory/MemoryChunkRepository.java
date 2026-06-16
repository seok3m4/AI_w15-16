package com.memento.feature.memory;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface MemoryChunkRepository {

    Optional<PostMemorySource> findActivePostSource(UUID postId, UUID ownerId);

    void saveAll(List<NewMemoryChunk> chunks);

    void markActiveChunksStale(UUID postId, UUID ownerId, Instant staleAt);

    void markChunksDeleted(UUID postId, UUID ownerId, Instant deletedAt);
}
