package com.memento.feature.friend;

import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FriendshipAccessService {

    private final FriendshipRepository friendshipRepository;

    FriendshipAccessService(FriendshipRepository friendshipRepository) {
        this.friendshipRepository = friendshipRepository;
    }

    public boolean hasAcceptedFriendship(UUID userId, UUID otherUserId) {
        return friendshipRepository.existsAcceptedBetween(userId, otherUserId);
    }
}

