package com.memento.feature.like;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/posts/{postId}/likes")
class PostLikeController {

    private final PostLikeCommandService postLikeCommandService;

    PostLikeController(PostLikeCommandService postLikeCommandService) {
        this.postLikeCommandService = postLikeCommandService;
    }

    @PostMapping
    PostLikeResponse like(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID postId) {
        return postLikeCommandService.like(currentUser.userId(), postId);
    }

    @DeleteMapping
    PostLikeResponse unlike(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID postId) {
        return postLikeCommandService.unlike(currentUser.userId(), postId);
    }
}
