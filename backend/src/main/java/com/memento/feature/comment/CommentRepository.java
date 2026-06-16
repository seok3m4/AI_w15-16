package com.memento.feature.comment;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface CommentRepository {

    Optional<CommentRecord> saveOnOwnedPost(NewComment comment);

    Optional<CommentRecord> updateByAuthor(UUID commentId, UUID authorId, String content, Instant updatedAt);

    boolean softDeleteByAuthor(UUID commentId, UUID authorId, Instant deletedAt);
}
