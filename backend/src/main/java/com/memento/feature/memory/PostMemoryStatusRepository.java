package com.memento.feature.memory;

import com.memento.feature.embedding.EmbeddingInputChunk;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface PostMemoryStatusRepository {

    Optional<PostMemoryStatus> findForOwnerAndPost(UUID ownerId, UUID postId);

    List<EmbeddingInputChunk> findActiveChunksForPost(UUID ownerId, UUID postId);
}
