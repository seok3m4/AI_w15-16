package com.memento.feature.post;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.auth.AuthenticatedUserPrincipal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PostController.class)
class PostControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PostCreateService postCreateService;

    @Test
    void createPostReturnsCreatedPostForCurrentUser() throws Exception {
        CreatePostRequest request = new CreatePostRequest(
                "오늘의 회고",
                "오늘 프로젝트에서 배운 점...",
                List.of("회고", "회고", "프로젝트"));
        PostResponse response = new PostResponse(
                POST_ID,
                new PostAuthorResponse(USER_ID, "cutan"),
                "오늘의 회고",
                "오늘 프로젝트에서 배운 점...",
                List.of(),
                0,
                0,
                false,
                "me",
                "pending",
                NOW,
                NOW);

        given(postCreateService.create(USER_ID, request)).willReturn(response);

        mockMvc.perform(post("/api/v1/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.author.id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.author.nickname").value("cutan"))
                .andExpect(jsonPath("$.title").value("오늘의 회고"))
                .andExpect(jsonPath("$.content").value("오늘 프로젝트에서 배운 점..."))
                .andExpect(jsonPath("$.tags").isArray())
                .andExpect(jsonPath("$.commentCount").value(0))
                .andExpect(jsonPath("$.likeCount").value(0))
                .andExpect(jsonPath("$.likedByMe").value(false))
                .andExpect(jsonPath("$.accessScope").value("me"))
                .andExpect(jsonPath("$.memoryStatus").value("pending"))
                .andExpect(jsonPath("$.createdAt").value("2026-06-15T03:10:00Z"))
                .andExpect(jsonPath("$.updatedAt").value("2026-06-15T03:10:00Z"));
    }

    @Test
    void createPostRejectsBlankTitleAndContent() throws Exception {
        mockMvc.perform(post("/api/v1/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", " ",
                                "content", ""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
