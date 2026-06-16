package com.memento.feature.comment;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class CommentController {

    private final CommentCreateService commentCreateService;
    private final CommentCommandService commentCommandService;
    private final CommentQueryService commentQueryService;

    CommentController(
            CommentCreateService commentCreateService,
            CommentCommandService commentCommandService,
            CommentQueryService commentQueryService) {
        this.commentCreateService = commentCreateService;
        this.commentCommandService = commentCommandService;
        this.commentQueryService = commentQueryService;
    }

    @GetMapping("/api/v1/posts/{postId}/comments")
    CommentListResponse list(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,asc") String sort) {
        return commentQueryService.list(currentUser.userId(), postId, page, size, sort);
    }

    @PostMapping("/api/v1/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    CommentResponse create(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID postId,
            @Valid @RequestBody CreateCommentRequest request) {
        return commentCreateService.create(currentUser.userId(), postId, request);
    }

    @PutMapping("/api/v1/comments/{commentId}")
    CommentResponse update(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID commentId,
            @Valid @RequestBody CreateCommentRequest request) {
        return commentCommandService.update(currentUser.userId(), commentId, request);
    }

    @DeleteMapping("/api/v1/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID commentId) {
        commentCommandService.delete(currentUser.userId(), commentId);
    }
}
