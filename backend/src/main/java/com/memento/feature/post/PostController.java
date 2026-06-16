package com.memento.feature.post;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/posts")
class PostController {

    private final PostCreateService postCreateService;
    private final PostQueryService postQueryService;
    private final PostCommandService postCommandService;

    PostController(
            PostCreateService postCreateService,
            PostQueryService postQueryService,
            PostCommandService postCommandService) {
        this.postCreateService = postCreateService;
        this.postQueryService = postQueryService;
        this.postCommandService = postCommandService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    PostResponse create(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @Valid @RequestBody CreatePostRequest request) {
        return postCreateService.create(currentUser.userId(), request);
    }

    @GetMapping
    PostListResponse list(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @RequestParam(defaultValue = "me") String scope,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        return postQueryService.list(currentUser.userId(), scope, page, size, sort);
    }

    @GetMapping("/{postId}")
    PostDetailResponse getDetail(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID postId) {
        return postQueryService.getDetail(currentUser.userId(), postId);
    }

    @PutMapping("/{postId}")
    PostResponse update(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID postId,
            @Valid @RequestBody CreatePostRequest request) {
        return postCommandService.update(currentUser.userId(), postId, request);
    }

    @DeleteMapping("/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID postId) {
        postCommandService.delete(currentUser.userId(), postId);
    }
}
