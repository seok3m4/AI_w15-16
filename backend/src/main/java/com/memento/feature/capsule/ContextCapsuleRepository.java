package com.memento.feature.capsule;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

interface ContextCapsuleRepository {

    ContextCapsuleRecord save(NewContextCapsule capsule);

    List<ContextCapsuleRecord> findPageByOwner(UUID ownerId, int limit, int offset);

    long countByOwner(UUID ownerId);

    Optional<ContextCapsuleRecord> findActiveByOwner(UUID ownerId, UUID capsuleId);

    boolean updateByOwner(UUID capsuleId, UUID ownerId, String title, String purpose, Instant updatedAt);

    boolean softDeleteByOwner(UUID ownerId, UUID capsuleId, Instant deletedAt);
}
