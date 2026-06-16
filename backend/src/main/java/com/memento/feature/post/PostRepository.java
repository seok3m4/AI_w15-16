package com.memento.feature.post;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface PostRepository {

    PostRecord save(NewPost post, List<String> tagNames);

    Optional<PostRecord> findById(UUID postId);

    List<PostRecord> findPageByAuthor(UUID authorId, int limit, int offset);

    long countByAuthor(UUID authorId);

    Optional<PostRecord> findByIdAndAuthor(UUID postId, UUID authorId);
}
