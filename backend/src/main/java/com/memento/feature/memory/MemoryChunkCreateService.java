package com.memento.feature.memory;

import com.memento.feature.embedding.EmbeddingInputChunk;
import com.memento.feature.embedding.MemoryEmbeddingJobEnqueuer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MemoryChunkCreateService {

    private final MemoryChunkRepository memoryChunkRepository;
    private final MemoryEmbeddingJobEnqueuer embeddingJobEnqueuer;
    private final Supplier<UUID> idSupplier;
    private final Clock clock;

    @Autowired
    MemoryChunkCreateService(
            MemoryChunkRepository memoryChunkRepository,
            MemoryEmbeddingJobEnqueuer embeddingJobEnqueuer,
            Clock clock) {
        this(memoryChunkRepository, embeddingJobEnqueuer, UUID::randomUUID, clock);
    }

    MemoryChunkCreateService(MemoryChunkRepository memoryChunkRepository, Supplier<UUID> idSupplier, Clock clock) {
        this(memoryChunkRepository, (ownerId, postId, chunks, reason) -> Optional.empty(), idSupplier, clock);
    }

    MemoryChunkCreateService(
            MemoryChunkRepository memoryChunkRepository,
            MemoryEmbeddingJobEnqueuer embeddingJobEnqueuer,
            Supplier<UUID> idSupplier,
            Clock clock) {
        this.memoryChunkRepository = memoryChunkRepository;
        this.embeddingJobEnqueuer = embeddingJobEnqueuer;
        this.idSupplier = idSupplier;
        this.clock = clock;
    }

    @Transactional
    void createForPost(UUID postId, UUID ownerId) {
        createForPost(postId, ownerId, "post_created");
    }

    @Transactional
    void refreshForUpdatedPost(UUID postId, UUID ownerId) {
        memoryChunkRepository.markActiveChunksStale(postId, ownerId, clock.instant());
        createForPost(postId, ownerId, "post_updated");
    }

    @Transactional
    void markPostDeleted(UUID postId, UUID ownerId) {
        memoryChunkRepository.markChunksDeleted(postId, ownerId, clock.instant());
    }

    private void createForPost(UUID postId, UUID ownerId, String reason) {
        Optional<PostMemorySource> source = memoryChunkRepository.findActivePostSource(postId, ownerId);
        if (source.isEmpty()) {
            return;
        }

        List<NewMemoryChunk> chunks = toChunks(source.get());
        memoryChunkRepository.saveAll(chunks);
        embeddingJobEnqueuer.enqueueForChunks(
                ownerId,
                postId,
                chunks.stream()
                        .map(chunk -> new EmbeddingInputChunk(chunk.id(), chunk.content()))
                        .toList(),
                reason);
    }

    private List<NewMemoryChunk> toChunks(PostMemorySource source) {
        Instant now = clock.instant();
        List<NewMemoryChunk> chunks = new ArrayList<>();
        addPostChunk(chunks, source, MemorySourceKind.POST_TITLE, source.title(), now);
        addPostChunk(chunks, source, MemorySourceKind.POST_CONTENT, source.content(), now);
        for (PostMemoryTagSource tag : source.tags()) {
            String content = tag.name() == null ? "" : tag.name().trim();
            if (!content.isEmpty()) {
                chunks.add(new NewMemoryChunk(
                        idSupplier.get(),
                        source.ownerId(),
                        source.postId(),
                        null,
                        tag.id(),
                        MemorySourceKind.TAG,
                        content,
                        hash(MemorySourceKind.TAG, tag.id(), content),
                        now));
            }
        }
        return List.copyOf(chunks);
    }

    private void addPostChunk(
            List<NewMemoryChunk> chunks,
            PostMemorySource source,
            MemorySourceKind sourceKind,
            String rawContent,
            Instant createdAt) {
        String content = rawContent == null ? "" : rawContent.trim();
        if (content.isEmpty()) {
            return;
        }
        chunks.add(new NewMemoryChunk(
                idSupplier.get(),
                source.ownerId(),
                source.postId(),
                null,
                null,
                sourceKind,
                content,
                hash(sourceKind, source.postId(), content),
                createdAt));
    }

    private byte[] hash(MemorySourceKind sourceKind, UUID sourceId, String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String hashInput = sourceKind.databaseValue() + "\n" + sourceId + "\n" + content;
            return digest.digest(hashInput.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 digest is unavailable.", exception);
        }
    }
}
