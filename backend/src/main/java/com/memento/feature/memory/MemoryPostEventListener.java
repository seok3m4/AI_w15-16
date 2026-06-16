package com.memento.feature.memory;

import com.memento.feature.post.PostCreatedEvent;
import com.memento.feature.post.PostDeletedEvent;
import com.memento.feature.post.PostUpdatedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
class MemoryPostEventListener {

    private final MemoryChunkCreateService memoryChunkCreateService;

    MemoryPostEventListener(MemoryChunkCreateService memoryChunkCreateService) {
        this.memoryChunkCreateService = memoryChunkCreateService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void handle(PostCreatedEvent event) {
        memoryChunkCreateService.createForPost(event.postId(), event.ownerId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void handle(PostUpdatedEvent event) {
        memoryChunkCreateService.refreshForUpdatedPost(event.postId(), event.ownerId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void handle(PostDeletedEvent event) {
        memoryChunkCreateService.markPostDeleted(event.postId(), event.ownerId());
    }
}
