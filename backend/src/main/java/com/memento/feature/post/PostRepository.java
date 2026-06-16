package com.memento.feature.post;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface PostRepository {

    PostRecord save(NewPost post, List<String> tagNames);

    List<PostRecord> findPageByAuthor(UUID authorId, int limit, int offset);

    long countByAuthor(UUID authorId);

    Optional<PostRecord> findByIdAndAuthor(UUID postId, UUID authorId);

    Optional<PostRecord> updateByAuthor(
            UUID postId,
            UUID authorId,
            String title,
            String content,
            List<String> tagNames,
            Instant updatedAt);

    boolean softDeleteByAuthor(UUID postId, UUID authorId, Instant deletedAt);
}
