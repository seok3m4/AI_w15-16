package com.memento.feature.post;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PostCreateService {

    private static final String INITIAL_MEMORY_STATUS = "pending";

    private final PostRepository postRepository;
    private final Supplier<UUID> idSupplier;
    private final Clock clock;

    @Autowired
    PostCreateService(PostRepository postRepository, Clock clock) {
        this(postRepository, UUID::randomUUID, clock);
    }

    PostCreateService(PostRepository postRepository, Supplier<UUID> idSupplier, Clock clock) {
        this.postRepository = postRepository;
        this.idSupplier = idSupplier;
        this.clock = clock;
    }

    @Transactional
    PostResponse create(UUID authorId, CreatePostRequest request) {
        Instant now = clock.instant();
        NewPost post = new NewPost(
                idSupplier.get(),
                authorId,
                request.title().trim(),
                request.content().trim(),
                INITIAL_MEMORY_STATUS,
                now);

        return PostResponse.from(postRepository.save(post, PostTagNames.normalize(request.tagNames())));
    }
}
