package com.memento.feature.memory;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MemoryChunkCreateService {

    private final MemoryChunkRepository memoryChunkRepository;
    private final Supplier<UUID> idSupplier;
    private final Clock clock;

    @Autowired
    MemoryChunkCreateService(MemoryChunkRepository memoryChunkRepository, Clock clock) {
        this(memoryChunkRepository, UUID::randomUUID, clock);
    }

    MemoryChunkCreateService(MemoryChunkRepository memoryChunkRepository, Supplier<UUID> idSupplier, Clock clock) {
        this.memoryChunkRepository = memoryChunkRepository;
        this.idSupplier = idSupplier;
        this.clock = clock;
    }

    @Transactional
    void createForPost(UUID postId, UUID ownerId) {
        memoryChunkRepository.findActivePostSource(postId, ownerId)
                .map(this::toChunks)
                .ifPresent(memoryChunkRepository::saveAll);
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
