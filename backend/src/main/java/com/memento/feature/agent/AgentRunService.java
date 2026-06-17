package com.memento.feature.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.memento.feature.jobs.AsyncJobRecord;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AgentRunService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final AgentRunRepository repository;
    private final AgentJobQueue jobQueue;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    AgentRunService(
            AgentRunRepository repository,
            AgentJobQueue jobQueue,
            ObjectMapper objectMapper,
            Clock clock) {
        this.repository = repository;
        this.jobQueue = jobQueue;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional
    AgentRunResponse start(UUID ownerId, AgentRunStartRequest request) {
        String goal = normalizeGoal(request.goal());
        List<String> allowedTools = normalizeAllowedTools(request.allowedTools());
        Instant now = clock.instant();
        AgentRunRecord run = repository.saveNew(ownerId, goal, allowedTools, now);
        AsyncJobRecord job = jobQueue.enqueueAgentTask(ownerId, agentTaskInput(run.id(), null));
        repository.attachJob(run.id(), job.id(), now);
        return run.toResponse(List.of());
    }

    @Transactional(readOnly = true)
    AgentRunResponse get(UUID ownerId, UUID runId) {
        AgentRunRecord run = repository.findForOwner(ownerId, runId)
                .orElseThrow(() -> new AgentRunNotFoundException(runId));
        return run.toResponse(repository.findPendingApprovals(runId));
    }

    @Transactional(readOnly = true)
    AgentStepListResponse listSteps(UUID ownerId, UUID runId, int page, int size) {
        repository.findForOwner(ownerId, runId)
                .orElseThrow(() -> new AgentRunNotFoundException(runId));
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = normalizePageSize(size);
        int offset = normalizedPage * normalizedSize;
        List<AgentStepRecord> records = repository.findStepsForOwner(ownerId, runId, normalizedSize, offset);
        long totalCount = repository.countStepsForOwner(ownerId, runId);
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / normalizedSize);
        return new AgentStepListResponse(
                records.stream().map(AgentStepRecord::toResponse).toList(),
                new AgentPageResponse(normalizedPage, normalizedSize, totalCount, totalPages));
    }

    @Transactional
    AgentApprovalDecisionResponse approve(UUID ownerId, UUID runId, UUID approvalId) {
        AgentApprovalRecord approval = repository.findPendingApprovalForOwner(ownerId, runId, approvalId)
                .orElseThrow(() -> new AgentRunNotFoundException(runId));
        Instant now = clock.instant();
        repository.markApprovalApproved(approval.id(), ownerId, now);
        repository.updateRunStatus(runId, "running", null, null, now);
        jobQueue.enqueueAgentTask(ownerId, agentTaskInput(runId, approvalId));
        return new AgentApprovalDecisionResponse(approvalId, "approved", "running", now);
    }

    @Transactional
    AgentApprovalDecisionResponse reject(UUID ownerId, UUID runId, UUID approvalId) {
        AgentApprovalRecord approval = repository.findPendingApprovalForOwner(ownerId, runId, approvalId)
                .orElseThrow(() -> new AgentRunNotFoundException(runId));
        Instant now = clock.instant();
        repository.markApprovalRejected(approval.id(), ownerId, now);
        repository.updateRunStatus(runId, "rejected", null, null, now);
        return new AgentApprovalDecisionResponse(approvalId, "rejected", "rejected", now);
    }

    private ObjectNode agentTaskInput(UUID runId, UUID approvalId) {
        ObjectNode input = objectMapper.createObjectNode();
        input.put("runId", runId.toString());
        if (approvalId != null) {
            input.put("resume", true);
            input.put("approvalId", approvalId.toString());
        }
        return input;
    }

    private String normalizeGoal(String goal) {
        if (goal == null || goal.isBlank()) {
            throw new AgentRunInvalidRequestException("goal must not be blank.");
        }
        return goal.trim();
    }

    private List<String> normalizeAllowedTools(List<String> allowedTools) {
        if (allowedTools == null || allowedTools.isEmpty()) {
            throw new AgentRunInvalidRequestException("allowedTools must not be empty.");
        }
        List<String> normalized = new LinkedHashSet<>(allowedTools.stream()
                .map(tool -> tool == null ? "" : tool.trim())
                .filter(tool -> !tool.isBlank())
                .toList()).stream().toList();
        if (normalized.isEmpty()) {
            throw new AgentRunInvalidRequestException("allowedTools must not be empty.");
        }
        return normalized;
    }

    private int normalizePageSize(int size) {
        if (size < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }
}

class AgentRunInvalidRequestException extends RuntimeException {

    AgentRunInvalidRequestException(String message) {
        super(message);
    }
}

class AgentRunNotFoundException extends RuntimeException {

    AgentRunNotFoundException(UUID runId) {
        super("Agent run was not found: " + runId);
    }
}
