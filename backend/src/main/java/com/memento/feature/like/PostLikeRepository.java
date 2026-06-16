package com.memento.feature.like;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface PostLikeRepository {

    Optional<PostLikeState> likeAccessiblePost(UUID postId, UUID userId, Instant likedAt);

    Optional<PostLikeState> unlikeAccessiblePost(UUID postId, UUID userId);
}
