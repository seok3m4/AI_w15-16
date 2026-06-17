package com.memento.feature.agent;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface AgentRunRepository {

    AgentRunRecord saveNew(UUID ownerId, String goal, List<String> allowedTools, Instant now);

    void attachJob(UUID runId, UUID jobId, Instant now);

    Optional<AgentRunRecord> findForOwner(UUID ownerId, UUID runId);

    List<AgentApprovalRecord> findPendingApprovals(UUID runId);

    Optional<AgentApprovalRecord> findPendingApprovalForOwner(UUID ownerId, UUID runId, UUID approvalId);

    List<AgentStepRecord> findStepsForOwner(UUID ownerId, UUID runId, int limit, int offset);

    long countStepsForOwner(UUID ownerId, UUID runId);

    void markApprovalApproved(UUID approvalId, UUID decidedBy, Instant now);

    void markApprovalRejected(UUID approvalId, UUID decidedBy, Instant now);

    void updateRunStatus(UUID runId, String status, JsonNode result, String failureReason, Instant now);
}
