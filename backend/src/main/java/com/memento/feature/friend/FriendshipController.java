package com.memento.feature.friend;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/friendships")
class FriendshipController {

    private final FriendshipCommandService friendshipCommandService;
    private final FriendshipQueryService friendshipQueryService;

    FriendshipController(
            FriendshipCommandService friendshipCommandService,
            FriendshipQueryService friendshipQueryService) {
        this.friendshipCommandService = friendshipCommandService;
        this.friendshipQueryService = friendshipQueryService;
    }

    @GetMapping
    FriendshipListResponse list(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @RequestParam(defaultValue = "accepted") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return friendshipQueryService.list(currentUser.userId(), status, page, size);
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

    @DeleteMapping("/{friendshipId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID friendshipId) {
        friendshipCommandService.delete(currentUser.userId(), friendshipId);
    }
}
