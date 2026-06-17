package com.memento.feature.capsule;

import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ContextCapsuleCommandService {

    private final ContextCapsuleRepository repository;
    private final Clock clock;

    ContextCapsuleCommandService(ContextCapsuleRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    ContextCapsuleResponse update(UUID currentUserId, UUID contextCapsuleId, UpdateContextCapsuleRequest request) {
        String title = request.title().trim();
        String purpose = request.purpose().trim();

        if (!repository.updateByOwner(contextCapsuleId, currentUserId, title, purpose, clock.instant())) {
            throw new ContextCapsuleNotFoundException(contextCapsuleId);
        }
        return repository.findActiveByOwner(currentUserId, contextCapsuleId)
                .map(ContextCapsuleResponse::from)
                .orElseThrow(() -> new ContextCapsuleNotFoundException(contextCapsuleId));
    }

    @Transactional
    void delete(UUID currentUserId, UUID contextCapsuleId) {
        if (!repository.softDeleteByOwner(currentUserId, contextCapsuleId, clock.instant())) {
            throw new ContextCapsuleNotFoundException(contextCapsuleId);
        }
    }
}

