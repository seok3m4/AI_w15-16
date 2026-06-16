package com.memento.feature.comment;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.auth.AuthenticatedUserPrincipal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CommentController.class)
class CommentControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID COMMENT_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CommentCreateService commentCreateService;

    @MockitoBean
    private CommentCommandService commentCommandService;

    @MockitoBean
    private CommentQueryService commentQueryService;

    @Test
    void listCommentsReturnsCurrentUsersPostCommentsWithPageMetadata() throws Exception {
        CommentResponse response = new CommentResponse(
                COMMENT_ID,
                POST_ID,
                new CommentAuthorResponse(USER_ID, "cutan"),
                "좋은 기록이네요.",
                NOW,
                NOW);
        given(commentQueryService.list(USER_ID, POST_ID, 0, 20, "createdAt,asc"))
                .willReturn(new CommentListResponse(
                        List.of(response),
                        new CommentPageResponse(0, 20, 1, 1)));

        mockMvc.perform(get("/api/v1/posts/{postId}/comments", POST_ID)
                        .param("page", "0")
                        .param("size", "20")
                        .param("sort", "createdAt,asc")
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value("33333333-3333-3333-3333-333333333333"))
                .andExpect(jsonPath("$.items[0].postId").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.items[0].author.nickname").value("cutan"))
                .andExpect(jsonPath("$.items[0].content").value("좋은 기록이네요."))
                .andExpect(jsonPath("$.page.page").value(0))
                .andExpect(jsonPath("$.page.size").value(20))
                .andExpect(jsonPath("$.page.totalCount").value(1))
                .andExpect(jsonPath("$.page.totalPages").value(1));
    }

    @Test
    void createCommentReturnsCreatedCommentForCurrentUser() throws Exception {
        CreateCommentRequest request = new CreateCommentRequest("좋은 기록이네요.");
        CommentResponse response = new CommentResponse(
                COMMENT_ID,
                POST_ID,
                new CommentAuthorResponse(USER_ID, "cutan"),
                "좋은 기록이네요.",
                NOW,
                NOW);

        given(commentCreateService.create(USER_ID, POST_ID, request)).willReturn(response);

        mockMvc.perform(post("/api/v1/posts/{postId}/comments", POST_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("33333333-3333-3333-3333-333333333333"))
                .andExpect(jsonPath("$.postId").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.author.id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.author.nickname").value("cutan"))
                .andExpect(jsonPath("$.content").value("좋은 기록이네요."))
                .andExpect(jsonPath("$.createdAt").value("2026-06-15T03:10:00Z"))
                .andExpect(jsonPath("$.updatedAt").value("2026-06-15T03:10:00Z"));
    }

    @Test
    void createCommentRejectsBlankContent() throws Exception {
        mockMvc.perform(post("/api/v1/posts/{postId}/comments", POST_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(new CreateCommentRequest(" ")) ))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("https://memento.local/problems/validation-error"))
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value("Request validation failed."))
                .andExpect(jsonPath("$.instance").value("/api/v1/posts/22222222-2222-2222-2222-222222222222/comments"))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("content"));
    }

    @Test
    void createCommentReturnsNotFoundWhenUserCannotAccessPost() throws Exception {
        CreateCommentRequest request = new CreateCommentRequest("좋은 기록이네요.");
        given(commentCreateService.create(USER_ID, POST_ID, request))
                .willThrow(new CommentPostNotFoundException(POST_ID));

        mockMvc.perform(post("/api/v1/posts/{postId}/comments", POST_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("https://memento.local/problems/post-not-found"))
                .andExpect(jsonPath("$.title").value("Post not found"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Post was not found."))
                .andExpect(jsonPath("$.instance").value("/api/v1/posts/22222222-2222-2222-2222-222222222222/comments"))
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    @Test
    void updateCommentReturnsUpdatedCommentForCurrentAuthor() throws Exception {
        CreateCommentRequest request = new CreateCommentRequest("Updated comment");
        CommentResponse response = new CommentResponse(
                COMMENT_ID,
                POST_ID,
                new CommentAuthorResponse(USER_ID, "cutan"),
                "Updated comment",
                NOW,
                Instant.parse("2026-06-16T09:30:00Z"));

        given(commentCommandService.update(USER_ID, COMMENT_ID, request)).willReturn(response);

        mockMvc.perform(put("/api/v1/comments/{commentId}", COMMENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("33333333-3333-3333-3333-333333333333"))
                .andExpect(jsonPath("$.postId").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.author.id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.content").value("Updated comment"))
                .andExpect(jsonPath("$.updatedAt").value("2026-06-16T09:30:00Z"));

        verify(commentCommandService).update(USER_ID, COMMENT_ID, request);
    }

    @Test
    void updateCommentRejectsBlankContent() throws Exception {
        mockMvc.perform(put("/api/v1/comments/{commentId}", COMMENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(new CreateCommentRequest(" "))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("content"));
    }

    @Test
    void updateCommentReturnsNotFoundWhenUserCannotAccessComment() throws Exception {
        CreateCommentRequest request = new CreateCommentRequest("Updated comment");
        given(commentCommandService.update(USER_ID, COMMENT_ID, request))
                .willThrow(new CommentNotFoundException(COMMENT_ID));

        mockMvc.perform(put("/api/v1/comments/{commentId}", COMMENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("https://memento.local/problems/comment-not-found"))
                .andExpect(jsonPath("$.title").value("Comment not found"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Comment was not found."))
                .andExpect(jsonPath("$.instance").value("/api/v1/comments/33333333-3333-3333-3333-333333333333"))
                .andExpect(jsonPath("$.code").value("COMMENT_NOT_FOUND"));
    }

    @Test
    void deleteCommentReturnsNoContentForCurrentAuthor() throws Exception {
        mockMvc.perform(delete("/api/v1/comments/{commentId}", COMMENT_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isNoContent());

        verify(commentCommandService).delete(USER_ID, COMMENT_ID);
    }

    @Test
    void deleteCommentReturnsNotFoundWhenUserCannotAccessComment() throws Exception {
        willThrow(new CommentNotFoundException(COMMENT_ID))
                .given(commentCommandService)
                .delete(USER_ID, COMMENT_ID);

        mockMvc.perform(delete("/api/v1/comments/{commentId}", COMMENT_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMMENT_NOT_FOUND"));
    }
}
