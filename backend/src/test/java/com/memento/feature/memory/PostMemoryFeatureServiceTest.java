package com.memento.feature.memory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.memento.feature.embedding.MemoryEmbeddingJobEnqueuer;
import com.memento.feature.embedding.QueryEmbedding;
import com.memento.feature.embedding.QueryEmbeddingService;
import com.memento.feature.friend.FriendshipAccessService;
import com.memento.feature.jobs.AsyncJobCommandService;
import com.memento.feature.privacy.AiSharingConsentReader;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PostMemoryFeatureServiceTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FRIEND_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    void searchMemoriesReturnsEmptyResultsWhenRepositoryFindsNoCandidates() {
        PostMemoryStatusRepository statusRepository = mock(PostMemoryStatusRepository.class);
        MemoryEmbeddingJobEnqueuer jobEnqueuer = mock(MemoryEmbeddingJobEnqueuer.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        JdbcMemoryVectorSearchRepository vectorSearchRepository = mock(JdbcMemoryVectorSearchRepository.class);
        QueryEmbeddingService queryEmbeddingService = mock(QueryEmbeddingService.class);
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader aiSharingConsentReader = mock(AiSharingConsentReader.class);
        PostMemoryFeatureService service = new PostMemoryFeatureService(
                statusRepository,
                jobEnqueuer,
                jobCommandService,
                vectorSearchRepository,
                queryEmbeddingService,
                friendshipAccessService,
                aiSharingConsentReader);

        QueryEmbedding queryEmbedding = new QueryEmbedding(
                "mock",
                "text-embedding-3-small",
                1536,
                List.of(0.1d, 0.2d));
        given(queryEmbeddingService.create("jwt decision")).willReturn(queryEmbedding);
        given(vectorSearchRepository.searchMe(
                        eq(OWNER_ID),
                        eq(queryEmbedding.vector()),
                        eq("mock"),
                        eq("text-embedding-3-small"),
                        eq(1536),
                        eq(5)))
                .willReturn(List.of());

        MemorySearchResponse response = service.searchMemories(
                OWNER_ID,
                new MemorySearchRequest(" jwt decision ", "me", 5));

        assertThat(response.query()).isEqualTo("jwt decision");
        assertThat(response.scope()).isEqualTo("me");
        assertThat(response.results()).isEmpty();
        verify(queryEmbeddingService).create("jwt decision");
        verify(vectorSearchRepository).searchMe(
                OWNER_ID,
                queryEmbedding.vector(),
                "mock",
                "text-embedding-3-small",
                1536,
                5);
    }

    @Test
    void searchMemoriesTreatsNullCandidatesAsEmptyResults() {
        PostMemoryStatusRepository statusRepository = mock(PostMemoryStatusRepository.class);
        MemoryEmbeddingJobEnqueuer jobEnqueuer = mock(MemoryEmbeddingJobEnqueuer.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        JdbcMemoryVectorSearchRepository vectorSearchRepository = mock(JdbcMemoryVectorSearchRepository.class);
        QueryEmbeddingService queryEmbeddingService = mock(QueryEmbeddingService.class);
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader aiSharingConsentReader = mock(AiSharingConsentReader.class);
        PostMemoryFeatureService service = new PostMemoryFeatureService(
                statusRepository,
                jobEnqueuer,
                jobCommandService,
                vectorSearchRepository,
                queryEmbeddingService,
                friendshipAccessService,
                aiSharingConsentReader);

        QueryEmbedding queryEmbedding = new QueryEmbedding(
                "mock",
                "text-embedding-3-small",
                1536,
                List.of(0.1d, 0.2d));
        given(queryEmbeddingService.create("jwt decision")).willReturn(queryEmbedding);
        given(vectorSearchRepository.searchMe(
                        eq(OWNER_ID),
                        eq(queryEmbedding.vector()),
                        eq("mock"),
                        eq("text-embedding-3-small"),
                        eq(1536),
                        eq(10)))
                .willReturn(null);

        MemorySearchResponse response = service.searchMemories(
                OWNER_ID,
                new MemorySearchRequest("jwt decision", null, null));

        assertThat(response.query()).isEqualTo("jwt decision");
        assertThat(response.scope()).isEqualTo("me");
        assertThat(response.results()).isEmpty();
        verify(vectorSearchRepository).searchMe(
                OWNER_ID,
                queryEmbedding.vector(),
                "mock",
                "text-embedding-3-small",
                1536,
                10);
    }

    @Test
    void searchFriendMemoriesReturnsEmptyResultsWhenFriendshipIsNotAllowed() {
        PostMemoryStatusRepository statusRepository = mock(PostMemoryStatusRepository.class);
        MemoryEmbeddingJobEnqueuer jobEnqueuer = mock(MemoryEmbeddingJobEnqueuer.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        JdbcMemoryVectorSearchRepository vectorSearchRepository = mock(JdbcMemoryVectorSearchRepository.class);
        QueryEmbeddingService queryEmbeddingService = mock(QueryEmbeddingService.class);
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader aiSharingConsentReader = mock(AiSharingConsentReader.class);
        given(friendshipAccessService.hasAcceptedFriendship(OWNER_ID, FRIEND_ID)).willReturn(false);
        given(aiSharingConsentReader.isFriendAiSharingEnabled(FRIEND_ID)).willReturn(true);
        PostMemoryFeatureService service = new PostMemoryFeatureService(
                statusRepository,
                jobEnqueuer,
                jobCommandService,
                vectorSearchRepository,
                queryEmbeddingService,
                friendshipAccessService,
                aiSharingConsentReader);

        FriendMemorySearchResponse response = service.searchFriendMemories(
                OWNER_ID,
                FRIEND_ID,
                new FriendMemorySearchRequest("friend memory", 5));

        assertThat(response.friendId()).isEqualTo(FRIEND_ID);
        assertThat(response.query()).isEqualTo("friend memory");
        assertThat(response.usedFriendContext()).isFalse();
        assertThat(response.results()).isEmpty();
        org.mockito.Mockito.verifyNoInteractions(queryEmbeddingService, vectorSearchRepository);
    }

    @Test
    void searchFriendMemoriesReturnsResultsWhenFriendshipAndConsentAreAllowed() {
        PostMemoryStatusRepository statusRepository = mock(PostMemoryStatusRepository.class);
        MemoryEmbeddingJobEnqueuer jobEnqueuer = mock(MemoryEmbeddingJobEnqueuer.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        JdbcMemoryVectorSearchRepository vectorSearchRepository = mock(JdbcMemoryVectorSearchRepository.class);
        QueryEmbeddingService queryEmbeddingService = mock(QueryEmbeddingService.class);
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader aiSharingConsentReader = mock(AiSharingConsentReader.class);
        given(friendshipAccessService.hasAcceptedFriendship(OWNER_ID, FRIEND_ID)).willReturn(true);
        given(aiSharingConsentReader.isFriendAiSharingEnabled(FRIEND_ID)).willReturn(true);
        QueryEmbedding queryEmbedding = new QueryEmbedding(
                "mock",
                "text-embedding-3-small",
                1536,
                List.of(0.1d, 0.2d));
        given(queryEmbeddingService.create("friend memory")).willReturn(queryEmbedding);
        given(vectorSearchRepository.searchFriend(
                        OWNER_ID,
                        FRIEND_ID,
                        queryEmbedding.vector(),
                        "mock",
                        "text-embedding-3-small",
                        1536,
                        5))
                .willReturn(List.of());
        PostMemoryFeatureService service = new PostMemoryFeatureService(
                statusRepository,
                jobEnqueuer,
                jobCommandService,
                vectorSearchRepository,
                queryEmbeddingService,
                friendshipAccessService,
                aiSharingConsentReader);

        FriendMemorySearchResponse response = service.searchFriendMemories(
                OWNER_ID,
                FRIEND_ID,
                new FriendMemorySearchRequest(" friend memory ", 5));

        assertThat(response.friendId()).isEqualTo(FRIEND_ID);
        assertThat(response.query()).isEqualTo("friend memory");
        assertThat(response.usedFriendContext()).isTrue();
        assertThat(response.results()).isEmpty();
        verify(queryEmbeddingService).create("friend memory");
        verify(vectorSearchRepository).searchFriend(
                OWNER_ID,
                FRIEND_ID,
                queryEmbedding.vector(),
                "mock",
                "text-embedding-3-small",
                1536,
                5);
    }
}
