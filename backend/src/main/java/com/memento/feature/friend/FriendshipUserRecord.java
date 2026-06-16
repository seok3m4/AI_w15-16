package com.memento.feature.friend;

import java.util.UUID;

record FriendshipUserRecord(UUID id, String nickname) {

    FriendshipUserResponse toResponse() {
        return new FriendshipUserResponse(id, nickname);
    }
}
