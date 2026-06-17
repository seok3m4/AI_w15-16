package com.memento.feature.agent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.jobs.AsyncJobRecord;
import com.memento.feature.jobs.AsyncJobStatus;
import com.memento.feature.jobs.AsyncJobType;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AgentRunServiceTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID RUN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID JOB_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID APPROVAL_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-06-17T03:10:00Z"), ZoneOffset.UTC);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RecordingAgentRunRepository repository = new RecordingAgentRunRepository();
    private final RecordingAgentJobQueue jobQueue = new RecordingAgentJobQueue();
    private final AgentRunService service = new AgentRunService(repository, jobQueue, objectMapper, CLOCK);

    @Test
    void startCreatesPendingRunAndAgentTaskJobWithSanitizedAllowedTools() {
        AgentRunStartRequest request = new AgentRunStartRequest(
                "  주간 회고를 만들고 Notion에 저장해줘  ",
                List.of("search_memories", "summarize", "search_memories", "notion_export"));

        AgentRunResponse response = service.start(OWNER_ID, request);

        assertThat(response.status()).isEqualTo("pending");
        assertThat(response.requiresApproval()).isFalse();
        assertThat(repository.savedRun.goal()).isEqualTo("주간 회고를 만들고 Notion에 저장해줘");
        assertThat(repository.savedRun.allowedTools()).containsExactly(
                "search_memories",
                "summarize",
                "notion_export");
        assertThat(jobQueue.enqueuedOwnerId).isEqualTo(OWNER_ID);
        assertThat(jobQueue.enqueuedType).isEqualTo(AsyncJobType.AGENT_TASK);
        assertThat(jobQueue.enqueuedInput.path("runId").asText()).isEqualTo(RUN_ID.toString());
        assertThat(repository.updatedJobId).isEqualTo(JOB_ID);
    }

    @Test
    void startRejectsBlankGoalAndEmptyAllowedTools() {
        assertThatThrownBy(() -> service.start(OWNER_ID, new AgentRunStartRequest(" ", List.of("search_memories"))))
                .isInstanceOf(AgentRunInvalidRequestException.class);
        assertThatThrownBy(() -> service.start(OWNER_ID, new AgentRunStartRequest("goal", List.of())))
                .isInstanceOf(AgentRunInvalidRequestException.class);
    }

    @Test
    void approveMarksApprovalAndRunRunningThenQueuesResumeJob() {
        repository.runForOwner = Optional.of(agentRun("approval_required"));
        repository.pendingApproval = Optional.of(new AgentApprovalRecord(
                APPROVAL_ID,
                RUN_ID,
                "external_write",
                "Notion 페이지를 생성합니다.",
                "pending",
                objectMapper.createObjectNode().put("toolName", "notion_export"),
                CLOCK.instant(),
                null,
                null));

        AgentApprovalDecisionResponse response = service.approve(OWNER_ID, RUN_ID, APPROVAL_ID);

        assertThat(response.status()).isEqualTo("approved");
        assertThat(response.agentRunStatus()).isEqualTo("running");
        assertThat(repository.approvedApprovalId).isEqualTo(APPROVAL_ID);
        assertThat(repository.runStatusUpdates).contains("running");
        assertThat(jobQueue.enqueuedInput.path("resume").asBoolean()).isTrue();
        assertThat(jobQueue.enqueuedInput.path("approvalId").asText()).isEqualTo(APPROVAL_ID.toString());
    }

    @Test
    void rejectMarksApprovalAndRunRejectedWithoutQueueingResumeJob() {
        repository.runForOwner = Optional.of(agentRun("approval_required"));
        repository.pendingApproval = Optional.of(new AgentApprovalRecord(
                APPROVAL_ID,
                RUN_ID,
                "external_write",
                "Notion 페이지를 생성합니다.",
                "pending",
                objectMapper.createObjectNode(),
                CLOCK.instant(),
                null,
                null));

        AgentApprovalDecisionResponse response = service.reject(OWNER_ID, RUN_ID, APPROVAL_ID);

        assertThat(response.status()).isEqualTo("rejected");
        assertThat(response.agentRunStatus()).isEqualTo("rejected");
        assertThat(repository.rejectedApprovalId).isEqualTo(APPROVAL_ID);
        assertThat(repository.runStatusUpdates).contains("rejected");
        assertThat(jobQueue.enqueuedInput).isNull();
    }

    @Test
    void getHidesRunsOwnedByOtherUsers() {
        repository.runForOwner = Optional.empty();

        assertThatThrownBy(() -> service.get(OWNER_ID, RUN_ID))
                .isInstanceOf(AgentRunNotFoundException.class);
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
                null,
                CLOCK.instant(),
                CLOCK.instant(),
                null);
    }

    private final class RecordingAgentRunRepository implements AgentRunRepository {
        private AgentRunRecord savedRun;
        private UUID updatedJobId;
        private Optional<AgentRunRecord> runForOwner = Optional.of(agentRun("pending"));
        private Optional<AgentApprovalRecord> pendingApproval = Optional.empty();
        private UUID approvedApprovalId;
        private UUID rejectedApprovalId;
        private final List<String> runStatusUpdates = new ArrayList<>();

        @Override
        public AgentRunRecord saveNew(UUID ownerId, String goal, List<String> allowedTools, Instant now) {
            savedRun = new AgentRunRecord(
                    RUN_ID,
                    ownerId,
                    goal,
                    allowedTools,
                    "pending",
                    null,
                    null,
                    null,
                    now,
                    now,
                    null);
            runForOwner = Optional.of(savedRun);
            return savedRun;
        }

        @Override
        public void attachJob(UUID runId, UUID jobId, Instant now) {
            updatedJobId = jobId;
        }

        @Override
        public Optional<AgentRunRecord> findForOwner(UUID ownerId, UUID runId) {
            return runForOwner.filter(run -> run.ownerId().equals(ownerId) && run.id().equals(runId));
        }

        @Override
        public List<AgentApprovalRecord> findPendingApprovals(UUID runId) {
            return pendingApproval.stream().toList();
        }

        @Override
        public Optional<AgentApprovalRecord> findPendingApprovalForOwner(UUID ownerId, UUID runId, UUID approvalId) {
            return pendingApproval.filter(approval -> approval.id().equals(approvalId)
                    && runForOwner.filter(run -> run.ownerId().equals(ownerId) && run.id().equals(runId)).isPresent());
        }

        @Override
        public List<AgentStepRecord> findStepsForOwner(UUID ownerId, UUID runId, int limit, int offset) {
            return List.of();
        }

        @Override
        public long countStepsForOwner(UUID ownerId, UUID runId) {
            return 0;
        }

        @Override
        public void markApprovalApproved(UUID approvalId, UUID decidedBy, Instant now) {
            approvedApprovalId = approvalId;
        }

        @Override
        public void markApprovalRejected(UUID approvalId, UUID decidedBy, Instant now) {
            rejectedApprovalId = approvalId;
        }

        @Override
        public void updateRunStatus(UUID runId, String status, JsonNode result, String failureReason, Instant now) {
            runStatusUpdates.add(status);
        }
    }

    private final class RecordingAgentJobQueue implements AgentJobQueue {
        private UUID enqueuedOwnerId;
        private AsyncJobType enqueuedType;
        private JsonNode enqueuedInput;

        @Override
        public AsyncJobRecord enqueueAgentTask(UUID ownerId, JsonNode input) {
            enqueuedOwnerId = ownerId;
            enqueuedType = AsyncJobType.AGENT_TASK;
            enqueuedInput = input;
            return new AsyncJobRecord(
                    JOB_ID,
                    ownerId,
                    AsyncJobType.AGENT_TASK,
                    AsyncJobStatus.PENDING,
                    0,
                    input,
                    null,
                    null,
                    false,
                    0,
                    1,
                    CLOCK.instant(),
                    CLOCK.instant(),
                    null,
                    null);
        }
    }
}
