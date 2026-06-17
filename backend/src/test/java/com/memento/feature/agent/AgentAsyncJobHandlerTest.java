package com.memento.feature.agent;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.jobs.ClaimedAsyncJob;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AgentAsyncJobHandlerTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID RUN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID JOB_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-06-17T03:10:00Z"), ZoneOffset.UTC);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RecordingAgentExecutionRepository repository = new RecordingAgentExecutionRepository();
    private final RecordingFastApiAgentClient client = new RecordingFastApiAgentClient();
    private final AgentAsyncJobHandler handler = new AgentAsyncJobHandler(repository, client, objectMapper, CLOCK);

    @Test
    void typeHandlesAgentTaskJobs() {
        assertThat(handler.type()).isEqualTo(AsyncJobType.AGENT_TASK);
    }

    @Test
    void handleStoresSucceededStepsAndMarksRunSucceeded() {
        repository.run = Optional.of(agentRun("pending"));
        client.response = new FastApiAgentRunResponse(
                "mock",
                "gpt-5.4-mini",
                RUN_ID.toString(),
                "succeeded",
                objectMapper.createObjectNode().put("summary", "1 agent tool step(s) completed."),
                List.of(new FastApiAgentStepResult(
                        1,
                        "search_memories",
                        "succeeded",
                        "최근 기억 검색",
                        "관련 게시글 2개 발견",
                        null,
                        null)),
                null,
                null);

        JsonNode result = handler.handle(job());

        assertThat(repository.statusUpdates).containsExactly("running", "succeeded");
        assertThat(repository.savedSteps).hasSize(1);
        assertThat(repository.savedSteps.getFirst().toolName()).isEqualTo("search_memories");
        assertThat(result.path("status").asText()).isEqualTo("succeeded");
        assertThat(client.request.runId()).isEqualTo(RUN_ID.toString());
        assertThat(client.request.allowedTools()).containsExactly("search_memories", "notion_export");
    }

    @Test
    void handleStoresPendingApprovalAndMarksRunApprovalRequired() {
        repository.run = Optional.of(agentRun("running"));
        client.response = new FastApiAgentRunResponse(
                "mock",
                "gpt-5.4-mini",
                RUN_ID.toString(),
                "approval_required",
                null,
                List.of(new FastApiAgentStepResult(
                        1,
                        "notion_export",
                        "approval_required",
                        "Notion export",
                        "사용자 승인이 필요합니다.",
                        null,
                        new FastApiAgentPendingApproval(
                                "external_write",
                                "Notion 페이지를 생성합니다.",
                                objectMapper.createObjectNode().put("toolName", "notion_export")))),
                new FastApiAgentPendingApproval(
                        "external_write",
                        "Notion 페이지를 생성합니다.",
                        objectMapper.createObjectNode().put("toolName", "notion_export")),
                null);

        JsonNode result = handler.handle(job());

        assertThat(repository.statusUpdates).containsExactly("running", "approval_required");
        assertThat(repository.savedApproval.description()).isEqualTo("Notion 페이지를 생성합니다.");
        assertThat(repository.savedToolLogStatus).isEqualTo("approval_required");
        assertThat(result.path("status").asText()).isEqualTo("approval_required");
    }

    private ClaimedAsyncJob job() {
        ObjectNode input = objectMapper.createObjectNode();
        input.put("runId", RUN_ID.toString());
        return new ClaimedAsyncJob(JOB_ID, OWNER_ID, AsyncJobType.AGENT_TASK, input, 1, 1);
    }

    private AgentRunRecord agentRun(String status) {
        return new AgentRunRecord(
                RUN_ID,
                OWNER_ID,
                "goal",
                List.of("search_memories", "notion_export"),
                status,
                null,
                null,
                JOB_ID,
                CLOCK.instant(),
                CLOCK.instant(),
                null);
    }

    private static final class RecordingFastApiAgentClient implements FastApiAgentClient {
        private FastApiAgentRunRequest request;
        private FastApiAgentRunResponse response;

        @Override
        public FastApiAgentRunResponse execute(FastApiAgentRunRequest request) {
            this.request = request;
            return response;
        }
    }

    private final class RecordingAgentExecutionRepository implements AgentExecutionRepository {
        private Optional<AgentRunRecord> run = Optional.empty();
        private final java.util.ArrayList<String> statusUpdates = new java.util.ArrayList<>();
        private final java.util.ArrayList<NewAgentStep> savedSteps = new java.util.ArrayList<>();
        private NewAgentApproval savedApproval;
        private String savedToolLogStatus;

        @Override
        public Optional<AgentRunRecord> findForExecution(UUID ownerId, UUID runId) {
            return run.filter(record -> record.ownerId().equals(ownerId) && record.id().equals(runId));
        }

        @Override
        public void updateRunStatus(UUID runId, String status, JsonNode result, String failureReason, Instant now) {
            statusUpdates.add(status);
        }

        @Override
        public UUID saveStep(NewAgentStep step, Instant now) {
            savedSteps.add(step);
            return UUID.fromString("55555555-5555-5555-5555-555555555555");
        }

        @Override
        public UUID saveApproval(NewAgentApproval approval, Instant now) {
            savedApproval = approval;
            return UUID.fromString("66666666-6666-6666-6666-666666666666");
        }

        @Override
        public void saveToolCallLog(NewToolCallLog log, Instant now) {
            savedToolLogStatus = log.status();
        }
    }
}
