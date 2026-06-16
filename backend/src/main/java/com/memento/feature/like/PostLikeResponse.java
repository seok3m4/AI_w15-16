package com.memento.feature.like;

import java.util.UUID;

record PostLikeResponse(UUID postId, boolean likedByMe, int likeCount) {

    static PostLikeResponse from(PostLikeState state) {
        return new PostLikeResponse(state.postId(), state.likedByMe(), state.likeCount());
    }
}
