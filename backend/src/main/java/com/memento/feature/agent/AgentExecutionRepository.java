package com.memento.feature.agent;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface AgentExecutionRepository {

    Optional<AgentRunRecord> findForExecution(UUID ownerId, UUID runId);

    void updateRunStatus(UUID runId, String status, JsonNode result, String failureReason, Instant now);

    UUID saveStep(NewAgentStep step, Instant now);

    UUID saveApproval(NewAgentApproval approval, Instant now);

    void saveToolCallLog(NewToolCallLog log, Instant now);
}
