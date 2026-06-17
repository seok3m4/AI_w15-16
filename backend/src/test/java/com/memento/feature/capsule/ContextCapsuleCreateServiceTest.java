package com.memento.feature.capsule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.memento.feature.friend.FriendshipAccessService;
import com.memento.feature.privacy.AiSharingConsentReader;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ContextCapsuleCreateServiceTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FRIEND_ID =
            UUID.fromString("12121212-1212-1212-1212-121212121212");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID CHUNK_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Test
    void createsCapsuleFromExplicitSourcePostIdsAfterDraftGeneration() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastApiContextCapsuleClient.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        ContextCapsuleCreateService service = service(sourceReader, aiClient, repository);

        ContextCapsuleSourceCandidate source = sourceCandidate(POST_ID, CHUNK_ID, OWNER_ID);
        given(sourceReader.findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID))).willReturn(List.of(source));
        given(aiClient.createDraft(any())).willReturn(draft("summary", List.of("fact"), List.of("api")));
        given(repository.save(any())).willAnswer(invocation -> savedRecord(invocation.getArgument(0)));

        ContextCapsuleResponse response = service.create(
                OWNER_ID,
                new CreateContextCapsuleRequest(
                        "project brief",
                        "external llm handoff",
                        "project",
                        "me",
                        null,
                        List.of(POST_ID)));

        assertThat(response.title()).isEqualTo("project brief");
        assertThat(response.purpose()).isEqualTo("external llm handoff");
        assertThat(response.query()).isEqualTo("project");
        assertThat(response.summary()).isEqualTo("summary");
        assertThat(response.keyFacts()).containsExactly("fact");
        assertThat(response.tags()).containsExactly("api");
        assertThat(response.containsFriendContext()).isFalse();
        assertThat(response.sources()).hasSize(1);
        verify(sourceReader).findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID));
        verify(aiClient).createDraft(any());
        verify(repository).save(any());
    }

    @Test
    void usesQuerySearchWhenSourcePostIdsAreMissing() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastApiContextCapsuleClient.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        ContextCapsuleCreateService service = service(sourceReader, aiClient, repository);

        given(sourceReader.searchSourcesForOwner(OWNER_ID, "project decision", 5))
                .willReturn(List.of(sourceCandidate(POST_ID, CHUNK_ID, OWNER_ID)));
        given(aiClient.createDraft(any())).willReturn(draft("query summary", List.of("decision"), List.of("tag")));
        given(repository.save(any())).willAnswer(invocation -> savedRecord(invocation.getArgument(0)));

        ContextCapsuleResponse response = service.create(
                OWNER_ID,
                new CreateContextCapsuleRequest("title", "purpose", " project decision ", "me", null, null));

        assertThat(response.summary()).isEqualTo("query summary");
        verify(sourceReader).searchSourcesForOwner(OWNER_ID, "project decision", 5);
    }

    @Test
    void createsFriendCapsuleOnlyWhenFriendshipAndConsentAllowContext() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastApiContextCapsuleClient.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader consentReader = mock(AiSharingConsentReader.class);
        ContextCapsuleCreateService service = new ContextCapsuleCreateService(
                sourceReader,
                aiClient,
                repository,
                friendshipAccessService,
                consentReader);

        given(friendshipAccessService.hasAcceptedFriendship(OWNER_ID, FRIEND_ID)).willReturn(true);
        given(consentReader.isFriendAiSharingEnabled(FRIEND_ID)).willReturn(true);
        given(sourceReader.searchSourcesForFriend(OWNER_ID, FRIEND_ID, "birthday gift", 5))
                .willReturn(List.of(sourceCandidate(POST_ID, CHUNK_ID, FRIEND_ID)));
        given(aiClient.createDraft(any())).willReturn(draft("friend summary", List.of("friend fact"), List.of("friend")));
        given(repository.save(any())).willAnswer(invocation -> savedRecord(invocation.getArgument(0)));

        ContextCapsuleResponse response = service.create(
                OWNER_ID,
                new CreateContextCapsuleRequest("title", "purpose", "birthday gift", "friend", FRIEND_ID, null));

        assertThat(response.containsFriendContext()).isTrue();
        assertThat(response.sources()).extracting(ContextCapsuleSourceResponse::ownerUserId).containsExactly(FRIEND_ID);
        verify(friendshipAccessService).hasAcceptedFriendship(OWNER_ID, FRIEND_ID);
        verify(consentReader).isFriendAiSharingEnabled(FRIEND_ID);
        verify(sourceReader).searchSourcesForFriend(OWNER_ID, FRIEND_ID, "birthday gift", 5);
    }

    @Test
    void rejectsFriendCapsuleWithoutConsentBeforeSourceLookup() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastApiContextCapsuleClient.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        FriendshipAccessService friendshipAccessService = mock(FriendshipAccessService.class);
        AiSharingConsentReader consentReader = mock(AiSharingConsentReader.class);
        ContextCapsuleCreateService service = new ContextCapsuleCreateService(
                sourceReader,
                aiClient,
                repository,
                friendshipAccessService,
                consentReader);

        given(friendshipAccessService.hasAcceptedFriendship(OWNER_ID, FRIEND_ID)).willReturn(true);
        given(consentReader.isFriendAiSharingEnabled(FRIEND_ID)).willReturn(false);

        assertThatThrownBy(() -> service.create(
                        OWNER_ID,
                        new CreateContextCapsuleRequest("title", "purpose", "birthday gift", "friend", FRIEND_ID, null)))
                .isInstanceOf(ContextCapsuleFriendContextNotAllowedException.class);
        verifyNoInteractions(sourceReader, aiClient, repository);
    }

    @Test
    void rejectsRequestWithoutSourcePostIdsOrQuery() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastApiContextCapsuleClient.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        ContextCapsuleCreateService service = service(sourceReader, aiClient, repository);

        assertThatThrownBy(() -> service.create(
                        OWNER_ID,
                        new CreateContextCapsuleRequest("title", "purpose", " ", "me", null, List.of())))
                .isInstanceOf(ContextCapsuleInvalidRequestException.class)
                .hasMessageContaining("sourcePostIds or query");
        verifyNoInteractions(sourceReader, aiClient, repository);
    }

    @Test
    void hidesMissingExplicitSourcesAsNotFound() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastApiContextCapsuleClient.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        ContextCapsuleCreateService service = service(sourceReader, aiClient, repository);

        given(sourceReader.findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID))).willReturn(List.of());

        assertThatThrownBy(() -> service.create(
                        OWNER_ID,
                        new CreateContextCapsuleRequest("title", "purpose", null, "me", null, List.of(POST_ID))))
                .isInstanceOf(ContextCapsuleSourceNotFoundException.class);
        verifyNoInteractions(aiClient, repository);
    }

    @Test
    void doesNotPersistWhenDraftGenerationFails() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastContextCapsuleClientThatFails.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        ContextCapsuleCreateService service = service(sourceReader, aiClient, repository);

        given(sourceReader.findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID)))
                .willReturn(List.of(sourceCandidate(POST_ID, CHUNK_ID, OWNER_ID)));
        given(aiClient.createDraft(any())).willThrow(new ContextCapsuleDraftFailedException());

        assertThatThrownBy(() -> service.create(
                        OWNER_ID,
                        new CreateContextCapsuleRequest("title", "purpose", null, "me", null, List.of(POST_ID))))
                .isInstanceOf(ContextCapsuleDraftFailedException.class);
        verifyNoInteractions(repository);
    }

    private ContextCapsuleDraftResponse draft(String summary, List<String> keyFacts, List<String> tags) {
        return new ContextCapsuleDraftResponse(
                "mock",
                "gpt-5.4-mini",
                "purpose",
                "query",
                summary,
                keyFacts,
                tags,
                false,
                new ContextCapsuleUsage(null, null, null));
    }

    private ContextCapsuleRecord savedRecord(NewContextCapsule capsule) {
        return new ContextCapsuleRecord(
                capsule.id(),
                capsule.ownerId(),
                capsule.title(),
                capsule.purpose(),
                capsule.query(),
                capsule.summary(),
                capsule.keyFacts(),
                capsule.tags(),
                capsule.containsFriendContext(),
                capsule.sources(),
                Instant.parse("2026-06-17T00:00:00Z"),
                Instant.parse("2026-06-17T00:00:00Z"));
    }

    private ContextCapsuleSourceCandidate sourceCandidate(UUID postId, UUID chunkId, UUID ownerUserId) {
        return new ContextCapsuleSourceCandidate(
                postId,
                chunkId,
                ownerUserId,
                "cutan",
                "auth implementation report",
                "Bearer access JWT and HttpOnly refresh token rotation were selected.",
                "post",
                Instant.parse("2026-06-17T00:00:00Z"));
    }

    private ContextCapsuleCreateService service(
            ContextCapsuleSourceReader sourceReader,
            FastApiContextCapsuleClient aiClient,
            ContextCapsuleRepository repository) {
        return new ContextCapsuleCreateService(
                sourceReader,
                aiClient,
                repository,
                mock(FriendshipAccessService.class),
                mock(AiSharingConsentReader.class));
    }

    private interface FastContextCapsuleClientThatFails extends FastApiContextCapsuleClient {
    }
}
