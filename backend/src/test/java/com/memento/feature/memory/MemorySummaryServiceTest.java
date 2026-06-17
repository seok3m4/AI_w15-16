package com.memento.feature.memory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.jobs.AsyncJobCommandService;
import com.memento.feature.jobs.AsyncJobRecord;
import com.memento.feature.jobs.AsyncJobStatus;
import com.memento.feature.jobs.AsyncJobType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MemorySummaryServiceTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID CHUNK_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID JOB_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final Instant NOW = Instant.parse("2026-06-17T00:00:00Z");

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void summarizesVerifiedOwnerSources() {
        MemorySummarySourceReader sourceReader = mock(MemorySummarySourceReader.class);
        FastApiMemorySummaryClient summaryClient = mock(FastApiMemorySummaryClient.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        MemorySummaryService service = new MemorySummaryService(
                sourceReader,
                summaryClient,
                jobCommandService,
                objectMapper);
        given(sourceReader.findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID)))
                .willReturn(List.of(source()));
        given(summaryClient.summarize(any())).willReturn(summaryResponse());

        MemorySummaryResponse response = service.summarize(
                OWNER_ID,
                new MemorySummaryRequest(" jwt decision ", "me", List.of(POST_ID, POST_ID), 5));

        assertThat(response.query()).isEqualTo("jwt decision");
        assertThat(response.answer()).contains("JWT Bearer");
        assertThat(response.usedFriendContext()).isFalse();
        assertThat(response.sources()).hasSize(1);
        verify(sourceReader).findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID));
        verify(summaryClient).summarize(any());
    }

    @Test
    void hidesSourcesThatAreMissingOrNotOwned() {
        MemorySummarySourceReader sourceReader = mock(MemorySummarySourceReader.class);
        FastApiMemorySummaryClient summaryClient = mock(FastApiMemorySummaryClient.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        MemorySummaryService service = new MemorySummaryService(
                sourceReader,
                summaryClient,
                jobCommandService,
                objectMapper);
        given(sourceReader.findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID))).willReturn(List.of());

        assertThatThrownBy(() -> service.summarize(
                        OWNER_ID,
                        new MemorySummaryRequest("jwt decision", "me", List.of(POST_ID), 5)))
                .isInstanceOf(PostNotFoundForMemoryStatusException.class);

        verifyNoInteractions(summaryClient);
    }

    @Test
    void enqueuesSummaryJobWithoutPersistingMemorySnippetsInInput() {
        MemorySummarySourceReader sourceReader = mock(MemorySummarySourceReader.class);
        FastApiMemorySummaryClient summaryClient = mock(FastApiMemorySummaryClient.class);
        AsyncJobCommandService jobCommandService = mock(AsyncJobCommandService.class);
        MemorySummaryService service = new MemorySummaryService(
                sourceReader,
                summaryClient,
                jobCommandService,
                objectMapper);
        given(sourceReader.findSourcesForOwnerPostIds(OWNER_ID, List.of(POST_ID)))
                .willReturn(List.of(source()));
        given(jobCommandService.enqueue(
                        any(),
                        any(),
                        any(),
                        org.mockito.ArgumentMatchers.anyBoolean()))
                .willReturn(jobRecord());

        AsyncJobResponse response = service.enqueue(
                OWNER_ID,
                new MemorySummaryRequest("jwt decision", "me", List.of(POST_ID), 5));

        assertThat(response.id()).isEqualTo(JOB_ID);
        assertThat(response.type()).isEqualTo("memory_summarize");
        verify(jobCommandService).enqueue(
                org.mockito.ArgumentMatchers.eq(OWNER_ID),
                org.mockito.ArgumentMatchers.eq(AsyncJobType.MEMORY_SUMMARIZE),
                org.mockito.ArgumentMatchers.argThat(input ->
                        input.path("query").asText().equals("jwt decision")
                                && input.path("sourcePostIds").get(0).asText().equals(POST_ID.toString())
                                && !input.toString().contains("Bearer access JWT")),
                org.mockito.ArgumentMatchers.eq(true));
    }

    private MemorySummarySource source() {
        return new MemorySummarySource(
                POST_ID,
                CHUNK_ID,
                OWNER_ID,
                "cutan",
                "인증 구현 회고",
                "Bearer access JWT와 HttpOnly refresh token rotation을 선택했다.",
                "post",
                NOW);
    }

    private FastApiMemorySummaryResponse summaryResponse() {
        return new FastApiMemorySummaryResponse(
                "mock",
                "gpt-5.4-mini",
                "jwt decision",
                "JWT Bearer를 기본 인증 방식으로 선택했습니다.",
                false,
                List.of(new FastApiMemorySummarySourceResponse(
                        OWNER_ID,
                        "cutan",
                        POST_ID,
                        "인증 구현 회고",
                        "post",
                        "JWT Bearer와 refresh token rotation을 선택했다.")),
                new FastApiMemorySummaryUsage(null, null, null));
    }

    private AsyncJobRecord jobRecord() {
        return new AsyncJobRecord(
                JOB_ID,
                OWNER_ID,
                AsyncJobType.MEMORY_SUMMARIZE,
                AsyncJobStatus.PENDING,
                0,
                objectMapper.createObjectNode(),
                null,
                null,
                true,
                0,
                3,
                NOW,
                NOW,
                null,
                null);
    }
}
