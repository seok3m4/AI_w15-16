package com.memento.feature.memory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.jobs.AsyncJobRetryableException;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.jobs.ClaimedAsyncJob;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MemorySummaryAsyncJobHandlerTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID JOB_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void handlesMemorySummarizeJob() {
        MemorySummaryService service = mock(MemorySummaryService.class);
        MemorySummaryAsyncJobHandler handler = new MemorySummaryAsyncJobHandler(service);
        JsonNode result = objectMapper.createObjectNode().put("answer", "ok");
        ClaimedAsyncJob job = new ClaimedAsyncJob(
                JOB_ID,
                OWNER_ID,
                AsyncJobType.MEMORY_SUMMARIZE,
                objectMapper.createObjectNode(),
                1,
                3);
        given(service.handleJob(job)).willReturn(result);

        assertThat(handler.type()).isEqualTo(AsyncJobType.MEMORY_SUMMARIZE);
        assertThat(handler.handle(job).path("answer").asText()).isEqualTo("ok");
    }

    @Test
    void mapsTimeoutToRetryableFailure() {
        MemorySummaryService service = mock(MemorySummaryService.class);
        MemorySummaryAsyncJobHandler handler = new MemorySummaryAsyncJobHandler(service);
        ClaimedAsyncJob job = new ClaimedAsyncJob(
                JOB_ID,
                OWNER_ID,
                AsyncJobType.MEMORY_SUMMARIZE,
                objectMapper.valueToTree(List.of()),
                1,
                3);
        given(service.handleJob(job)).willThrow(new MemorySummaryTimeoutException(new RuntimeException("timeout")));

        assertThatThrownBy(() -> handler.handle(job))
                .isInstanceOf(AsyncJobRetryableException.class)
                .hasMessageContaining("temporarily unavailable");
    }
}
