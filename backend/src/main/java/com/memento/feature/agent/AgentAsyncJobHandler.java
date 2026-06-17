package com.memento.feature.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.memento.feature.jobs.AsyncJobHandler;
import com.memento.feature.jobs.AsyncJobType;
import com.memento.feature.jobs.ClaimedAsyncJob;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class AgentAsyncJobHandler implements AsyncJobHandler {

    private static final int MAX_STEPS = 8;

    private final AgentExecutionRepository repository;
    private final FastApiAgentClient fastApiAgentClient;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    AgentAsyncJobHandler(
            AgentExecutionRepository repository,
            FastApiAgentClient fastApiAgentClient,
            ObjectMapper objectMapper,
            Clock clock) {
        this.repository = repository;
        this.fastApiAgentClient = fastApiAgentClient;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Override
    public AsyncJobType type() {
        return AsyncJobType.AGENT_TASK;
    }

    @Override
    public JsonNode handle(ClaimedAsyncJob job) {
        UUID runId = UUID.fromString(job.input().path("runId").asText());
        AgentRunRecord run = repository.findForExecution(job.ownerId(), runId)
                .orElseThrow(() -> new AgentRunNotFoundException(runId));
        Instant now = clock.instant();
        repository.updateRunStatus(run.id(), "running", null, null, now);

        FastApiAgentRunResponse response = fastApiAgentClient.execute(toFastApiRequest(job, run));
        List<FastApiAgentStepResult> steps = response.steps() == null ? List.of() : response.steps();
        for (FastApiAgentStepResult step : steps) {
            UUID stepId = repository.saveStep(new NewAgentStep(
                    run.id(),
                    step.stepOrder(),
                    step.toolName(),
                    step.status(),
                    step.inputSummary(),
                    step.outputSummary(),
                    step.error()), now);
            repository.saveToolCallLog(new NewToolCallLog(
                    run.id(),
                    stepId,
                    job.ownerId(),
                    step.toolName(),
                    summarizedInput(step),
                    summarizedOutput(step),
                    toolLogStatus(step.status()),
                    step.error()), now);
        }

        if ("approval_required".equals(response.status())) {
            FastApiAgentPendingApproval approval = response.pendingApproval();
            if (approval == null) {
                approval = steps.stream()
                        .map(FastApiAgentStepResult::approval)
                        .filter(candidate -> candidate != null)
                        .findFirst()
                        .orElseThrow(() -> new AgentRunInvalidRequestException("approval_required response needs approval."));
            }
            repository.saveApproval(new NewAgentApproval(
                    run.id(),
                    approval.type(),
                    approval.description(),
                    approval.payload()), now);
            repository.updateRunStatus(run.id(), "approval_required", null, null, now);
            return result("approval_required", null);
        }

        if ("failed".equals(response.status())) {
            repository.updateRunStatus(run.id(), "failed", null, response.failureReason(), now);
            return result("failed", response.failureReason());
        }

        repository.updateRunStatus(run.id(), "succeeded", response.result(), null, now);
        return result("succeeded", null);
    }

    private FastApiAgentRunRequest toFastApiRequest(ClaimedAsyncJob job, AgentRunRecord run) {
        return new FastApiAgentRunRequest(
                UUID.randomUUID().toString(),
                run.id().toString(),
                job.id().toString(),
                "agent-run:" + run.id() + ":" + job.id(),
                run.goal(),
                run.allowedTools(),
                new FastApiAgentUserContext(run.ownerId().toString(), null),
                "Spring Boot verified current user scope before tool execution.",
                MAX_STEPS);
    }

    private ObjectNode summarizedInput(FastApiAgentStepResult step) {
        ObjectNode input = objectMapper.createObjectNode();
        input.put("inputSummary", step.inputSummary());
        return input;
    }

    private ObjectNode summarizedOutput(FastApiAgentStepResult step) {
        ObjectNode output = objectMapper.createObjectNode();
        output.put("outputSummary", step.outputSummary());
        return output;
    }

    private String toolLogStatus(String stepStatus) {
        if ("approval_required".equals(stepStatus)) {
            return "approval_required";
        }
        if ("failed".equals(stepStatus)) {
            return "failed";
        }
        return "succeeded";
    }

    private ObjectNode result(String status, String failureReason) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("status", status);
        if (failureReason != null) {
            result.put("failureReason", failureReason);
        }
        return result;
    }
}
