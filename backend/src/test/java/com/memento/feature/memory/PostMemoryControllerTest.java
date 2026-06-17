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
    private static final UUID FRIEND_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final Instant CREATED_AT = Instant.parse("2026-06-16T09:30:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PostMemoryFeatureService service;

    @MockitoBean
    private MemorySummaryService summaryService;

    @MockitoBean
    private FriendGiftRecommendationService giftRecommendationService;

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
    void summarizeMemorySearchReturnsSummaryWithSources() throws Exception {
        MemorySummaryRequest request = new MemorySummaryRequest("jwt decision", "me", List.of(POST_ID), 5);
        MemorySummaryResponse response = new MemorySummaryResponse(
                "jwt decision",
                "JWT Bearer를 기본 인증 방식으로 선택했습니다.",
                false,
                List.of(new MemorySummarySourceResponse(
                        USER_ID,
                        "cutan",
                        POST_ID,
                        "Retrospective",
                        "post",
                        "JWT Bearer와 refresh token rotation을 선택했다.")));
        given(summaryService.summarize(USER_ID, request)).willReturn(response);

        mockMvc.perform(post("/api/v1/memory-search/summarize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.query").value("jwt decision"))
                .andExpect(jsonPath("$.answer").value("JWT Bearer를 기본 인증 방식으로 선택했습니다."))
                .andExpect(jsonPath("$.usedFriendContext").value(false))
                .andExpect(jsonPath("$.sources[0].ownerUserId").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.sources[0].postId").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.sources[0].sourceType").value("post"));

        verify(summaryService).summarize(USER_ID, request);
    }

    @Test
    void summarizeMemorySearchReturnsAcceptedJobWhenProviderTimesOut() throws Exception {
        MemorySummaryRequest request = new MemorySummaryRequest("jwt decision", "me", List.of(POST_ID), 5);
        UUID jobId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        AsyncJobResponse jobResponse = new AsyncJobResponse(
                jobId,
                "memory_summarize",
                "pending",
                0,
                true,
                null,
                null,
                CREATED_AT,
                CREATED_AT,
                null);
        given(summaryService.summarize(USER_ID, request))
                .willThrow(new MemorySummaryTimeoutException(new RuntimeException("timeout")));
        given(summaryService.enqueue(USER_ID, request)).willReturn(jobResponse);

        mockMvc.perform(post("/api/v1/memory-search/summarize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value("55555555-5555-5555-5555-555555555555"))
                .andExpect(jsonPath("$.type").value("memory_summarize"))
                .andExpect(jsonPath("$.status").value("pending"));
    }

    @Test
    void summarizeMemorySearchMapsProviderFailureToBadGateway() throws Exception {
        MemorySummaryRequest request = new MemorySummaryRequest("jwt decision", "me", List.of(POST_ID), 5);
        given(summaryService.summarize(USER_ID, request)).willThrow(new MemorySummaryProviderException());

        mockMvc.perform(post("/api/v1/memory-search/summarize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("SUMMARY_PROVIDER_UNAVAILABLE"));
    }

    @Test
    void searchMemoriesReturnsEmptyResultsWhenNoCandidateExists() throws Exception {
        MemorySearchRequest request = new MemorySearchRequest("jwt decision", "me", 5);
        MemorySearchResponse response = new MemorySearchResponse("jwt decision", "me", List.of());
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
                .andExpect(jsonPath("$.results").isArray())
                .andExpect(jsonPath("$.results").isEmpty());

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

    @Test
    void searchFriendMemoriesReturnsFriendContextResults() throws Exception {
        FriendMemorySearchRequest request = new FriendMemorySearchRequest("friend memory", 5);
        FriendMemorySearchResponse response = new FriendMemorySearchResponse(
                FRIEND_ID,
                "friend memory",
                true,
                List.of(new MemorySearchResultItem(
                        POST_ID,
                        CHUNK_ID,
                        FRIEND_ID,
                        "friend",
                        "Retrospective",
                        "JWT Bearer decision",
                        0.91d,
                        "post_content",
                        CREATED_AT)));
        given(service.searchFriendMemories(USER_ID, FRIEND_ID, request)).willReturn(response);

        mockMvc.perform(post("/api/v1/friends/{friendId}/memory-search", FRIEND_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.friendId").value("44444444-4444-4444-4444-444444444444"))
                .andExpect(jsonPath("$.query").value("friend memory"))
                .andExpect(jsonPath("$.usedFriendContext").value(true))
                .andExpect(jsonPath("$.results[0].ownerUserId").value("44444444-4444-4444-4444-444444444444"))
                .andExpect(jsonPath("$.results[0].sourceType").value("post_content"));

        verify(service).searchFriendMemories(USER_ID, FRIEND_ID, request);
    }

    @Test
    void searchFriendMemoriesReturnsEmptyWhenConsentDisabledOrNotFriend() throws Exception {
        FriendMemorySearchRequest request = new FriendMemorySearchRequest("friend memory", 5);
        FriendMemorySearchResponse response = new FriendMemorySearchResponse(
                FRIEND_ID,
                "friend memory",
                false,
                List.of());
        given(service.searchFriendMemories(USER_ID, FRIEND_ID, request)).willReturn(response);

        mockMvc.perform(post("/api/v1/friends/{friendId}/memory-search", FRIEND_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.friendId").value("44444444-4444-4444-4444-444444444444"))
                .andExpect(jsonPath("$.query").value("friend memory"))
                .andExpect(jsonPath("$.usedFriendContext").value(false))
                .andExpect(jsonPath("$.results").isArray())
                .andExpect(jsonPath("$.results").isEmpty());

        verify(service).searchFriendMemories(USER_ID, FRIEND_ID, request);
    }

    @Test
    void searchFriendMemoriesRejectsBlankQuery() throws Exception {
        mockMvc.perform(post("/api/v1/friends/{friendId}/memory-search", FRIEND_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(Map.of(
                                "query", " ",
                                "limit", 5))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_MEMORY_SEARCH_REQUEST"));
    }

    @Test
    void recommendFriendGiftsReturnsRecommendationsWithSources() throws Exception {
        FriendGiftRecommendationRequest request = new FriendGiftRecommendationRequest(
                "birthday",
                new GiftBudgetRequest(30000, 70000, "KRW"),
                "coffee",
                5);
        FriendGiftRecommendationResponse response = new FriendGiftRecommendationResponse(
                FRIEND_ID,
                "birthday",
                "Coffee sampler is a good fit.",
                List.of(new GiftRecommendationItemResponse(
                        "Coffee sampler",
                        "Coffee evidence.",
                        "medium")),
                List.of(new GiftRecommendationSourceResponse(
                        FRIEND_ID,
                        "friend",
                        POST_ID,
                        "Coffee notes",
                        "post",
                        "Coffee was mentioned.")));
        given(giftRecommendationService.recommend(USER_ID, FRIEND_ID, request)).willReturn(response);

        mockMvc.perform(post("/api/v1/friends/{friendId}/gift-recommendations", FRIEND_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.friendId").value("44444444-4444-4444-4444-444444444444"))
                .andExpect(jsonPath("$.occasion").value("birthday"))
                .andExpect(jsonPath("$.answer").value("Coffee sampler is a good fit."))
                .andExpect(jsonPath("$.recommendations[0].title").value("Coffee sampler"))
                .andExpect(jsonPath("$.sources[0].ownerUserId").value("44444444-4444-4444-4444-444444444444"));

        verify(giftRecommendationService).recommend(USER_ID, FRIEND_ID, request);
    }

    @Test
    void recommendFriendGiftsReturnsAcceptedJobWhenProviderTimesOut() throws Exception {
        FriendGiftRecommendationRequest request = new FriendGiftRecommendationRequest(
                "birthday",
                null,
                "coffee",
                5);
        UUID jobId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        AsyncJobResponse jobResponse = new AsyncJobResponse(
                jobId,
                "gift_recommendation",
                "pending",
                0,
                true,
                null,
                null,
                CREATED_AT,
                CREATED_AT,
                null);
        given(giftRecommendationService.recommend(USER_ID, FRIEND_ID, request))
                .willThrow(new GiftRecommendationTimeoutException(new RuntimeException("timeout")));
        given(giftRecommendationService.enqueue(USER_ID, FRIEND_ID, request)).willReturn(jobResponse);

        mockMvc.perform(post("/api/v1/friends/{friendId}/gift-recommendations", FRIEND_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value("55555555-5555-5555-5555-555555555555"))
                .andExpect(jsonPath("$.type").value("gift_recommendation"));
    }

    @Test
    void recommendFriendGiftsMapsConsentFailureToForbidden() throws Exception {
        FriendGiftRecommendationRequest request = new FriendGiftRecommendationRequest(
                "birthday",
                null,
                "coffee",
                5);
        given(giftRecommendationService.recommend(USER_ID, FRIEND_ID, request))
                .willThrow(new FriendAiContextNotAllowedException());

        mockMvc.perform(post("/api/v1/friends/{friendId}/gift-recommendations", FRIEND_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FRIEND_AI_CONTEXT_NOT_ALLOWED"));
    }
}
