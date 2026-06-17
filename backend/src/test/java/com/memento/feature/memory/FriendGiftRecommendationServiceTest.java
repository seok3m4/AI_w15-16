package com.memento.feature.memory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.embedding.QueryEmbedding;
import com.memento.feature.embedding.QueryEmbeddingService;
import com.memento.feature.friend.FriendshipAccessService;
import com.memento.feature.jobs.AsyncJobCommandService;
import com.memento.feature.jobs.AsyncJobRecord;
import com.memento.feature.jobs.AsyncJobStatus;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.privacy.AiSharingConsentReader;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FriendGiftRecommendationServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FRIEND_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID POST_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID CHUNK_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");

    @Test
    void recommendRejectsWhenFriendshipOrConsentIsMissingWithoutCallingEmbeddingOrProvider() {
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader consentReader = mock(AiSharingConsentReader.class);
        QueryEmbeddingService queryEmbeddingService = mock(QueryEmbeddingService.class);
        JdbcMemoryVectorSearchRepository vectorSearchRepository = mock(JdbcMemoryVectorSearchRepository.class);
        FastApiFriendGiftRecommendationClient aiClient = mock(FastApiFriendGiftRecommendationClient.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        FriendGiftRecommendationService service = new FriendGiftRecommendationService(
                friendshipAccessService,
                consentReader,
                queryEmbeddingService,
                vectorSearchRepository,
                aiClient,
                jobCommandService,
                new ObjectMapper());
        given(friendshipAccessService.hasAcceptedFriendship(USER_ID, FRIEND_ID)).willReturn(false);

        assertThatThrownBy(() -> service.recommend(
                        USER_ID,
                        FRIEND_ID,
                        new FriendGiftRecommendationRequest("birthday", null, "coffee", 5)))
                .isInstanceOf(FriendAiContextNotAllowedException.class);

        verifyNoInteractions(queryEmbeddingService, vectorSearchRepository, aiClient, jobCommandService);
    }

    @Test
    void recommendUsesOnlyVerifiedFriendSourcesAndReturnsProviderRecommendations() {
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader consentReader = mock(AiSharingConsentReader.class);
        QueryEmbeddingService queryEmbeddingService = mock(QueryEmbeddingService.class);
        JdbcMemoryVectorSearchRepository vectorSearchRepository = mock(JdbcMemoryVectorSearchRepository.class);
        FastApiFriendGiftRecommendationClient aiClient = mock(FastApiFriendGiftRecommendationClient.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        FriendGiftRecommendationService service = new FriendGiftRecommendationService(
                friendshipAccessService,
                consentReader,
                queryEmbeddingService,
                vectorSearchRepository,
                aiClient,
                jobCommandService,
                new ObjectMapper());
        given(friendshipAccessService.hasAcceptedFriendship(USER_ID, FRIEND_ID)).willReturn(true);
        given(consentReader.isFriendAiSharingEnabled(FRIEND_ID)).willReturn(true);
        QueryEmbedding embedding = new QueryEmbedding("mock", "text-embedding-3-small", 1536, List.of(0.1d, 0.2d));
        given(queryEmbeddingService.create("birthday gift coffee")).willReturn(embedding);
        MemoryVectorSearchCandidate candidate = new MemoryVectorSearchCandidate(
                POST_ID,
                CHUNK_ID,
                FRIEND_ID,
                "friend",
                "Coffee notes",
                "Recently interested in hand drip coffee.",
                MemorySourceKind.POST_CONTENT,
                0.4d,
                Instant.parse("2026-06-16T00:00:00Z"));
        given(vectorSearchRepository.searchFriend(
                        USER_ID,
                        FRIEND_ID,
                        embedding.vector(),
                        "mock",
                        "text-embedding-3-small",
                        1536,
                        5))
                .willReturn(List.of(candidate));
        given(aiClient.recommend(any(FastApiFriendGiftRecommendationRequest.class)))
                .willReturn(new FastApiFriendGiftRecommendationResponse(
                        "mock",
                        "gpt-5.4-mini",
                        FRIEND_ID,
                        "birthday",
                        "Coffee sampler is a good fit.",
                        List.of(new FastApiGiftRecommendationItem("Coffee sampler", "Coffee evidence.", "medium")),
                        List.of(new FastApiGiftRecommendationSource(
                                FRIEND_ID,
                                "friend",
                                POST_ID,
                                "Coffee notes",
                                "post",
                                "Recently interested in coffee."))));

        FriendGiftRecommendationResponse response = service.recommend(
                USER_ID,
                FRIEND_ID,
                new FriendGiftRecommendationRequest(" birthday ", null, " coffee ", 5));

        assertThat(response.friendId()).isEqualTo(FRIEND_ID);
        assertThat(response.occasion()).isEqualTo("birthday");
        assertThat(response.answer()).isEqualTo("Coffee sampler is a good fit.");
        assertThat(response.recommendations()).hasSize(1);
        assertThat(response.sources()).singleElement().satisfies(source -> {
            assertThat(source.ownerUserId()).isEqualTo(FRIEND_ID);
            assertThat(source.postId()).isEqualTo(POST_ID);
        });
        verify(aiClient).recommend(any(FastApiFriendGiftRecommendationRequest.class));
    }

    @Test
    void enqueueStoresNormalizedGiftRecommendationJobInputAfterGatePasses() {
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader consentReader = mock(AiSharingConsentReader.class);
        QueryEmbeddingService queryEmbeddingService = mock(QueryEmbeddingService.class);
        JdbcMemoryVectorSearchRepository vectorSearchRepository = mock(JdbcMemoryVectorSearchRepository.class);
        FastApiFriendGiftRecommendationClient aiClient = mock(FastApiFriendGiftRecommendationClient.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        FriendGiftRecommendationService service = new FriendGiftRecommendationService(
                friendshipAccessService,
                consentReader,
                queryEmbeddingService,
                vectorSearchRepository,
                aiClient,
                jobCommandService,
                new ObjectMapper());
        given(friendshipAccessService.hasAcceptedFriendship(USER_ID, FRIEND_ID)).willReturn(true);
        given(consentReader.isFriendAiSharingEnabled(FRIEND_ID)).willReturn(true);
        UUID jobId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        given(jobCommandService.enqueue(eq(USER_ID), eq(AsyncJobType.GIFT_RECOMMENDATION), any(), eq(true)))
                .willReturn(new AsyncJobRecord(
                        jobId,
                        USER_ID,
                        AsyncJobType.GIFT_RECOMMENDATION,
                        AsyncJobStatus.PENDING,
                        0,
                        new ObjectMapper().createObjectNode(),
                        null,
                        null,
                        true,
                        0,
                        3,
                        Instant.parse("2026-06-16T00:00:00Z"),
                        Instant.parse("2026-06-16T00:00:00Z"),
                        null,
                        null));

        AsyncJobResponse response = service.enqueue(
                USER_ID,
                FRIEND_ID,
                new FriendGiftRecommendationRequest("birthday", null, "coffee", 5));

        assertThat(response.id()).isEqualTo(jobId);
        assertThat(response.type()).isEqualTo("gift_recommendation");
        verify(jobCommandService).enqueue(eq(USER_ID), eq(AsyncJobType.GIFT_RECOMMENDATION), any(), eq(true));
    }
}
