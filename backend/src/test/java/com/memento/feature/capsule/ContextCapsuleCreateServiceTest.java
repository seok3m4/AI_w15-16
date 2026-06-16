package com.memento.feature.capsule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ContextCapsuleCreateServiceTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID CHUNK_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Test
    void createsCapsuleFromExplicitSourcePostIdsAfterDraftGeneration() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastApiContextCapsuleClient.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        ContextCapsuleCreateService service = new ContextCapsuleCreateService(sourceReader, aiClient, repository);

        ContextCapsuleSourceCandidate source = sourceCandidate(POST_ID, CHUNK_ID);
        given(sourceReader.findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID))).willReturn(List.of(source));
        given(aiClient.createDraft(any())).willReturn(new ContextCapsuleDraftResponse(
                "mock",
                "gpt-5.4-mini",
                "외부 LLM 맥락",
                "프로젝트",
                "최근 인증과 memory search를 구현했다.",
                List.of("JWT 인증을 사용한다."),
                List.of("프로젝트", "API"),
                false,
                new ContextCapsuleUsage(null, null, null)));
        given(repository.save(any())).willAnswer(invocation -> {
            NewContextCapsule capsule = invocation.getArgument(0);
            return savedRecord(capsule);
        });

        ContextCapsuleResponse response = service.create(
                OWNER_ID,
                new CreateContextCapsuleRequest(
                        "내 프로젝트 맥락",
                        " 외부 LLM 맥락 ",
                        " 프로젝트 ",
                        "me",
                        List.of(POST_ID)));

        assertThat(response.title()).isEqualTo("내 프로젝트 맥락");
        assertThat(response.purpose()).isEqualTo("외부 LLM 맥락");
        assertThat(response.query()).isEqualTo("프로젝트");
        assertThat(response.summary()).isEqualTo("최근 인증과 memory search를 구현했다.");
        assertThat(response.keyFacts()).containsExactly("JWT 인증을 사용한다.");
        assertThat(response.tags()).containsExactly("프로젝트", "API");
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
        ContextCapsuleCreateService service = new ContextCapsuleCreateService(sourceReader, aiClient, repository);

        given(sourceReader.searchSourcesForOwner(OWNER_ID, "프로젝트 결정", 5))
                .willReturn(List.of(sourceCandidate(POST_ID, CHUNK_ID)));
        given(aiClient.createDraft(any())).willReturn(new ContextCapsuleDraftResponse(
                "mock",
                "gpt-5.4-mini",
                "목적",
                "프로젝트 결정",
                "요약",
                List.of("핵심 사실"),
                List.of("tag"),
                false,
                new ContextCapsuleUsage(null, null, null)));
        given(repository.save(any())).willAnswer(invocation -> {
            NewContextCapsule capsule = invocation.getArgument(0);
            return savedRecord(capsule);
        });

        ContextCapsuleResponse response = service.create(
                OWNER_ID,
                new CreateContextCapsuleRequest("제목", "목적", " 프로젝트 결정 ", "me", null));

        assertThat(response.summary()).isEqualTo("요약");
        verify(sourceReader).searchSourcesForOwner(OWNER_ID, "프로젝트 결정", 5);
    }

    @Test
    void rejectsRequestWithoutSourcePostIdsOrQuery() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastApiContextCapsuleClient.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        ContextCapsuleCreateService service = new ContextCapsuleCreateService(sourceReader, aiClient, repository);

        assertThatThrownBy(() -> service.create(
                        OWNER_ID,
                        new CreateContextCapsuleRequest("제목", "목적", " ", "me", List.of())))
                .isInstanceOf(ContextCapsuleInvalidRequestException.class)
                .hasMessageContaining("sourcePostIds or query");
        verifyNoInteractions(sourceReader, aiClient, repository);
    }

    @Test
    void hidesMissingExplicitSourcesAsNotFound() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastApiContextCapsuleClient.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        ContextCapsuleCreateService service = new ContextCapsuleCreateService(sourceReader, aiClient, repository);

        given(sourceReader.findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID))).willReturn(List.of());

        assertThatThrownBy(() -> service.create(
                        OWNER_ID,
                        new CreateContextCapsuleRequest("제목", "목적", null, "me", List.of(POST_ID))))
                .isInstanceOf(ContextCapsuleSourceNotFoundException.class);
        verifyNoInteractions(aiClient, repository);
    }

    @Test
    void doesNotPersistWhenDraftGenerationFails() {
        ContextCapsuleSourceReader sourceReader = mock(ContextCapsuleSourceReader.class);
        FastApiContextCapsuleClient aiClient = mock(FastContextCapsuleClientThatFails.class);
        ContextCapsuleRepository repository = mock(ContextCapsuleRepository.class);
        ContextCapsuleCreateService service = new ContextCapsuleCreateService(sourceReader, aiClient, repository);

        given(sourceReader.findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID)))
                .willReturn(List.of(sourceCandidate(POST_ID, CHUNK_ID)));
        given(aiClient.createDraft(any())).willThrow(new ContextCapsuleDraftFailedException());

        assertThatThrownBy(() -> service.create(
                        OWNER_ID,
                        new CreateContextCapsuleRequest("제목", "목적", null, "me", List.of(POST_ID))))
                .isInstanceOf(ContextCapsuleDraftFailedException.class);
        verifyNoInteractions(repository);
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

    private ContextCapsuleSourceCandidate sourceCandidate(UUID postId, UUID chunkId) {
        return new ContextCapsuleSourceCandidate(
                postId,
                chunkId,
                OWNER_ID,
                "cutan",
                "인증 구현 회고",
                "Bearer access JWT와 HttpOnly refresh token rotation을 선택했다.",
                "post",
                Instant.parse("2026-06-17T00:00:00Z"));
    }

    private interface FastContextCapsuleClientThatFails extends FastApiContextCapsuleClient {
    }
}
