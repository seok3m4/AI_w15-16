package com.memento.feature.memory;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MemoryChunkCreateServiceTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID TITLE_CHUNK_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID CONTENT_CHUNK_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID TAG_CHUNK_ID =
            UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID SECOND_TAG_CHUNK_ID =
            UUID.fromString("66666666-6666-6666-6666-666666666666");
    private static final UUID TAG_ID =
            UUID.fromString("77777777-7777-7777-7777-777777777777");
    private static final UUID SECOND_TAG_ID =
            UUID.fromString("88888888-8888-8888-8888-888888888888");
    private static final Instant NOW = Instant.parse("2026-06-16T09:30:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void createForPostStoresTitleContentAndTagChunksInsideOwnerScope() {
        CapturingMemoryChunkRepository repository = new CapturingMemoryChunkRepository(Optional.of(
                new PostMemorySource(
                        POST_ID,
                        OWNER_ID,
                        "Jungle project retrospective",
                        "Today I learned how to shape memory chunks.",
                        List.of(
                                new PostMemoryTagSource(TAG_ID, "retrospective"),
                                new PostMemoryTagSource(SECOND_TAG_ID, "project")))));
        MemoryChunkCreateService service = new MemoryChunkCreateService(
                repository,
                new SequentialUuidSupplier(List.of(TITLE_CHUNK_ID, CONTENT_CHUNK_ID, TAG_CHUNK_ID, SECOND_TAG_CHUNK_ID)),
                CLOCK);

        service.createForPost(POST_ID, OWNER_ID);

        assertThat(repository.loadedPostId).isEqualTo(POST_ID);
        assertThat(repository.loadedOwnerId).isEqualTo(OWNER_ID);
        assertThat(repository.savedChunks)
                .extracting(NewMemoryChunk::id)
                .containsExactly(TITLE_CHUNK_ID, CONTENT_CHUNK_ID, TAG_CHUNK_ID, SECOND_TAG_CHUNK_ID);
        assertThat(repository.savedChunks)
                .extracting(NewMemoryChunk::sourceKind)
                .containsExactly(
                        MemorySourceKind.POST_TITLE,
                        MemorySourceKind.POST_CONTENT,
                        MemorySourceKind.TAG,
                        MemorySourceKind.TAG);
        assertThat(repository.savedChunks)
                .extracting(NewMemoryChunk::content)
                .containsExactly(
                        "Jungle project retrospective",
                        "Today I learned how to shape memory chunks.",
                        "retrospective",
                        "project");
        assertThat(repository.savedChunks.get(0).tagId()).isNull();
        assertThat(repository.savedChunks.get(2).tagId()).isEqualTo(TAG_ID);
        assertThat(repository.savedChunks.get(3).tagId()).isEqualTo(SECOND_TAG_ID);
        assertThat(repository.savedChunks)
                .allSatisfy(chunk -> {
                    assertThat(chunk.ownerId()).isEqualTo(OWNER_ID);
                    assertThat(chunk.postId()).isEqualTo(POST_ID);
                    assertThat(chunk.createdAt()).isEqualTo(NOW);
                    assertThat(chunk.contentHash()).hasSize(32);
                });
        assertThat(repository.savedChunks.get(0).contentHash())
                .isNotEqualTo(repository.savedChunks.get(1).contentHash());
    }

    @Test
    void createForPostDoesNothingWhenPostIsNotAvailableInOwnerScope() {
        CapturingMemoryChunkRepository repository = new CapturingMemoryChunkRepository(Optional.empty());
        MemoryChunkCreateService service = new MemoryChunkCreateService(
                repository,
                new SequentialUuidSupplier(List.of(TITLE_CHUNK_ID)),
                CLOCK);

        service.createForPost(POST_ID, OWNER_ID);

        assertThat(repository.loadedPostId).isEqualTo(POST_ID);
        assertThat(repository.loadedOwnerId).isEqualTo(OWNER_ID);
        assertThat(repository.savedChunks).isEmpty();
    }

    private static class CapturingMemoryChunkRepository implements MemoryChunkRepository {

        private final Optional<PostMemorySource> source;
        private UUID loadedPostId;
        private UUID loadedOwnerId;
        private final List<NewMemoryChunk> savedChunks = new ArrayList<>();

        private CapturingMemoryChunkRepository(Optional<PostMemorySource> source) {
            this.source = source;
        }

        @Override
        public Optional<PostMemorySource> findActivePostSource(UUID postId, UUID ownerId) {
            loadedPostId = postId;
            loadedOwnerId = ownerId;
            return source;
        }

        @Override
        public void saveAll(List<NewMemoryChunk> chunks) {
            savedChunks.addAll(chunks);
        }
    }

    private static class SequentialUuidSupplier implements java.util.function.Supplier<UUID> {

        private final List<UUID> values;
        private int index;

        private SequentialUuidSupplier(List<UUID> values) {
            this.values = values;
        }

        @Override
        public UUID get() {
            return values.get(index++);
        }
    }
}
