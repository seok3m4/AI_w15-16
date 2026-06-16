package com.memento.feature.like;

import java.util.UUID;

record PostLikeState(UUID postId, boolean likedByMe, int likeCount) {
}
