package com.memento.feature.memory;

import static org.assertj.core.api.Assertions.assertThat;

import com.memento.feature.post.PostCreatedEvent;
import com.memento.feature.post.PostDeletedEvent;
import com.memento.feature.post.PostUpdatedEvent;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MemoryPostEventListenerTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    void delegatesPostCreatedEventsToChunkCreation() {
        RecordingMemoryChunkCreateService service = new RecordingMemoryChunkCreateService();
        MemoryPostEventListener listener = new MemoryPostEventListener(service);

        listener.handle(new PostCreatedEvent(POST_ID, OWNER_ID));

        assertThat(service.createdPostId).isEqualTo(POST_ID);
        assertThat(service.createdOwnerId).isEqualTo(OWNER_ID);
    }

    @Test
    void delegatesPostUpdatedEventsToChunkRefresh() {
        RecordingMemoryChunkCreateService service = new RecordingMemoryChunkCreateService();
        MemoryPostEventListener listener = new MemoryPostEventListener(service);

        listener.handle(new PostUpdatedEvent(POST_ID, OWNER_ID));

        assertThat(service.refreshedPostId).isEqualTo(POST_ID);
        assertThat(service.refreshedOwnerId).isEqualTo(OWNER_ID);
    }

    @Test
    void delegatesPostDeletedEventsToChunkDeletion() {
        RecordingMemoryChunkCreateService service = new RecordingMemoryChunkCreateService();
        MemoryPostEventListener listener = new MemoryPostEventListener(service);

        listener.handle(new PostDeletedEvent(POST_ID, OWNER_ID));

        assertThat(service.deletedPostId).isEqualTo(POST_ID);
        assertThat(service.deletedOwnerId).isEqualTo(OWNER_ID);
    }

    private static class RecordingMemoryChunkCreateService extends MemoryChunkCreateService {

        private UUID createdPostId;
        private UUID createdOwnerId;
        private UUID refreshedPostId;
        private UUID refreshedOwnerId;
        private UUID deletedPostId;
        private UUID deletedOwnerId;

        RecordingMemoryChunkCreateService() {
            super(new NoopMemoryChunkRepository(), UUID::randomUUID, java.time.Clock.systemUTC());
        }

        @Override
        void createForPost(UUID postId, UUID ownerId) {
            createdPostId = postId;
            createdOwnerId = ownerId;
        }

        @Override
        void refreshForUpdatedPost(UUID postId, UUID ownerId) {
            refreshedPostId = postId;
            refreshedOwnerId = ownerId;
        }

        @Override
        void markPostDeleted(UUID postId, UUID ownerId) {
            deletedPostId = postId;
            deletedOwnerId = ownerId;
        }
    }

    private static class NoopMemoryChunkRepository implements MemoryChunkRepository {

        @Override
        public java.util.Optional<PostMemorySource> findActivePostSource(UUID postId, UUID ownerId) {
            return java.util.Optional.empty();
        }

        @Override
        public void saveAll(java.util.List<NewMemoryChunk> chunks) {
        }

        @Override
        public void markActiveChunksStale(UUID postId, UUID ownerId, java.time.Instant staleAt) {
        }

        @Override
        public void markChunksDeleted(UUID postId, UUID ownerId, java.time.Instant deletedAt) {
        }
    }
}
