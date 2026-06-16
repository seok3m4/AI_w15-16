package com.memento.feature.post;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/posts")
class PostController {

    private final PostCreateService postCreateService;

    PostController(PostCreateService postCreateService) {
        this.postCreateService = postCreateService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PostResponse create(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @Valid @RequestBody CreatePostRequest request) {
        return postCreateService.create(currentUser.userId(), request);
    }
}
