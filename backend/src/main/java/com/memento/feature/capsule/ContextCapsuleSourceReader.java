package com.memento.feature.capsule;

import java.util.List;
import java.util.UUID;

interface ContextCapsuleSourceReader {

    List<ContextCapsuleSourceCandidate> findSourcesForOwnerPostIds(UUID ownerId, List<UUID> postIds);

    List<ContextCapsuleSourceCandidate> searchSourcesForOwner(UUID ownerId, String query, int limit);

    List<ContextCapsuleSourceCandidate> findSourcesForFriendPostIds(UUID requesterId, UUID friendId, List<UUID> postIds);

    List<ContextCapsuleSourceCandidate> searchSourcesForFriend(UUID requesterId, UUID friendId, String query, int limit);
}
