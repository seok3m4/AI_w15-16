package com.memento.feature.memory;

import com.memento.feature.post.PostCreatedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
class MemoryPostCreatedListener {

    private final MemoryChunkCreateService memoryChunkCreateService;

    MemoryPostCreatedListener(MemoryChunkCreateService memoryChunkCreateService) {
        this.memoryChunkCreateService = memoryChunkCreateService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void handle(PostCreatedEvent event) {
        memoryChunkCreateService.createForPost(event.postId(), event.ownerId());
    }
}
