package com.memento.feature.friend;

import java.util.List;

record FriendshipListResponse(List<FriendshipListItemResponse> items, FriendshipPageResponse page) {
}
