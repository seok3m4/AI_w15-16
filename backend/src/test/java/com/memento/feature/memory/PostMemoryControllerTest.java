package com.memento.feature.memory;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
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

@WebMvcTest(PostMemoryController.class)
class PostMemoryControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID CHUNK_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant CREATED_AT = Instant.parse("2026-06-16T09:30:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PostMemoryFeatureService service;

    @Test
    void searchMemoriesReturnsScopeMeResultsForCurrentUser() throws Exception {
        MemorySearchRequest request = new MemorySearchRequest("jwt decision", "me", 5);
        MemorySearchResponse response = new MemorySearchResponse(
                "jwt decision",
                "me",
                List.of(new MemorySearchResultItem(
                        POST_ID,
                        CHUNK_ID,
                        USER_ID,
                        "cutan",
                        "Retrospective",
                        "JWT Bearer decision",
                        0.82d,
                        "post_content",
                        CREATED_AT)));
        given(service.searchMemories(USER_ID, request)).willReturn(response);

        mockMvc.perform(post("/api/v1/memory-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("jwt decision"))
                .andExpect(jsonPath("$.scope").value("me"))
                .andExpect(jsonPath("$.results[0].postId").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.results[0].chunkId").value("33333333-3333-3333-3333-333333333333"))
                .andExpect(jsonPath("$.results[0].ownerUserId").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.results[0].ownerNickname").value("cutan"))
                .andExpect(jsonPath("$.results[0].sourceType").value("post_content"));

        verify(service).searchMemories(USER_ID, request);
    }

    @Test
    void searchMemoriesRejectsBlankQuery() throws Exception {
        mockMvc.perform(post("/api/v1/memory-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(Map.of(
                                "query", " ",
                                "scope", "me",
                                "limit", 5))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_MEMORY_SEARCH_REQUEST"));
    }

    @Test
    void searchMemoriesMapsUnsupportedScopeToBadRequest() throws Exception {
        MemorySearchRequest request = new MemorySearchRequest("jwt decision", "friends", 5);
        given(service.searchMemories(USER_ID, request))
                .willThrow(new MemorySearchRequestInvalidException("scope must be me for P1 memory search."));

        mockMvc.perform(post("/api/v1/memory-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_MEMORY_SEARCH_REQUEST"));
    }

    @Test
    void searchMemoriesMapsEmbeddingFailureToBadGateway() throws Exception {
        MemorySearchRequest request = new MemorySearchRequest("jwt decision", "me", 5);
        given(service.searchMemories(USER_ID, request))
                .willThrow(new MemorySearchEmbeddingFailedException(new RuntimeException("timeout")));

        mockMvc.perform(post("/api/v1/memory-search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("EMBEDDING_PROVIDER_UNAVAILABLE"));
    }
}
