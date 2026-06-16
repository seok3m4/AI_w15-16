package com.memento.feature.comment;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface CommentRepository {

    Optional<CommentRecord> saveOnAccessiblePost(NewComment comment);

    Optional<CommentRecord> updateByAuthor(UUID commentId, UUID authorId, String content, Instant updatedAt);

    boolean softDeleteByAuthor(UUID commentId, UUID authorId, Instant deletedAt);

    boolean existsActivePostAccessibleTo(UUID postId, UUID accessorId);

    List<CommentRecord> findPageByAccessiblePost(UUID postId, UUID accessorId, int limit, int offset);

    long countByAccessiblePost(UUID postId, UUID accessorId);
}
