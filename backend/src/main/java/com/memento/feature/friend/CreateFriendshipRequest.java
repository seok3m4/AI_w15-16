package com.memento.feature.friend;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

record CreateFriendshipRequest(@NotNull UUID addresseeUserId) {
}
