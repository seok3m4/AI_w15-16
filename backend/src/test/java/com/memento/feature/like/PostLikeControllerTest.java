package com.memento.feature.like;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PostLikeController.class)
class PostLikeControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PostLikeCommandService postLikeCommandService;

    @Test
    void likePostReturnsCurrentLikeState() throws Exception {
        given(postLikeCommandService.like(USER_ID, POST_ID))
                .willReturn(new PostLikeResponse(POST_ID, true, 5));

        mockMvc.perform(post("/api/v1/posts/{postId}/likes", POST_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.postId").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.likedByMe").value(true))
                .andExpect(jsonPath("$.likeCount").value(5));
    }

    @Test
    void likePostReturnsNotFoundWhenPostIsHidden() throws Exception {
        given(postLikeCommandService.like(USER_ID, POST_ID))
                .willThrow(new PostLikePostNotFoundException(POST_ID));

        mockMvc.perform(post("/api/v1/posts/{postId}/likes", POST_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }

    @Test
    void unlikePostReturnsCurrentLikeState() throws Exception {
        given(postLikeCommandService.unlike(USER_ID, POST_ID))
                .willReturn(new PostLikeResponse(POST_ID, false, 4));

        mockMvc.perform(delete("/api/v1/posts/{postId}/likes", POST_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.postId").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.likedByMe").value(false))
                .andExpect(jsonPath("$.likeCount").value(4));
    }

    @Test
    void unlikePostReturnsNotFoundWhenPostIsHidden() throws Exception {
        given(postLikeCommandService.unlike(USER_ID, POST_ID))
                .willThrow(new PostLikePostNotFoundException(POST_ID));

        mockMvc.perform(delete("/api/v1/posts/{postId}/likes", POST_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
    }
}
