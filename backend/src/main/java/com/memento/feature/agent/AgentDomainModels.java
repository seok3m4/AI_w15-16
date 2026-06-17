package com.memento.feature.agent;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

record AgentRunRecord(
        UUID id,
        UUID ownerId,
        String goal,
        List<String> allowedTools,
        String status,
        JsonNode result,
        String failureReason,
        UUID jobId,
        Instant createdAt,
        Instant updatedAt,
        Instant completedAt) {

    AgentRunResponse toResponse(List<AgentApprovalRecord> pendingApprovals) {
        return new AgentRunResponse(
                id,
                goal,
                status,
                "approval_required".equals(status) && !pendingApprovals.isEmpty(),
                result,
                pendingApprovals.stream().map(AgentApprovalRecord::toResponse).toList(),
                failureReason,
                createdAt,
                updatedAt);
    }
}

record AgentApprovalRecord(
        UUID id,
        UUID runId,
        String type,
        String description,
        String status,
        JsonNode payload,
        Instant requestedAt,
        Instant decidedAt,
        Instant expiresAt) {

    AgentApprovalResponse toResponse() {
        return new AgentApprovalResponse(id, type, description, requestedAt);
    }
}

record AgentStepRecord(
        UUID id,
        UUID runId,
        int stepOrder,
        String toolName,
        String status,
        String inputSummary,
        String outputSummary,
        JsonNode error,
        Instant createdAt,
        Instant updatedAt) {

    AgentStepResponse toResponse() {
        return new AgentStepResponse(
                id,
                stepOrder,
                toolName,
                status,
                inputSummary,
                outputSummary,
                createdAt,
                updatedAt);
    }
}
