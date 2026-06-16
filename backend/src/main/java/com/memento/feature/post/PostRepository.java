package com.memento.feature.post;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface PostRepository {

    PostRecord save(NewPost post, List<String> tagNames);

    List<PostRecord> findPageByAuthor(UUID authorId, String keyword, String normalizedTag, int limit, int offset);

    long countByAuthor(UUID authorId, String keyword, String normalizedTag);

    List<PostRecord> findPageByAcceptedFriends(UUID accessorId, int limit, int offset);

    long countByAcceptedFriends(UUID accessorId);

    Optional<PostRecord> findByIdAndAuthor(UUID postId, UUID authorId);

    Optional<PostRecord> findByIdAccessibleTo(UUID postId, UUID accessorId);

    Optional<PostRecord> updateByAuthor(
            UUID postId,
            UUID authorId,
            String title,
            String content,
            List<String> tagNames,
            Instant updatedAt);

    boolean softDeleteByAuthor(UUID postId, UUID authorId, Instant deletedAt);
}
