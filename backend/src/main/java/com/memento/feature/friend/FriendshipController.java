package com.memento.feature.friend;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/friendships")
class FriendshipController {

    private final FriendshipCommandService friendshipCommandService;

    FriendshipController(FriendshipCommandService friendshipCommandService) {
        this.friendshipCommandService = friendshipCommandService;
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    FriendshipResponse createRequest(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @Valid @RequestBody CreateFriendshipRequest request) {
        return friendshipCommandService.createRequest(currentUser.userId(), request);
    }

    @PostMapping("/{friendshipId}/accept")
    FriendshipStatusResponse accept(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID friendshipId) {
        return friendshipCommandService.accept(currentUser.userId(), friendshipId);
    }

    @PostMapping("/{friendshipId}/reject")
    FriendshipStatusResponse reject(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID friendshipId) {
        return friendshipCommandService.reject(currentUser.userId(), friendshipId);
    }
}
