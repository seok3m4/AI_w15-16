package com.memento.feature.agent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

record AgentRunStartRequest(
        @NotBlank String goal,
        @NotEmpty List<@NotBlank String> allowedTools) {
}

record AgentRunResponse(
        UUID id,
        String goal,
        String status,
        boolean requiresApproval,
        Object result,
        List<AgentApprovalResponse> pendingApprovals,
        String failureReason,
        Instant createdAt,
        Instant updatedAt) {
}

record AgentApprovalResponse(
        UUID id,
        String type,
        String description,
        Instant createdAt) {
}

record AgentStepResponse(
        UUID id,
        int stepOrder,
        String toolName,
        String status,
        String inputSummary,
        String outputSummary,
        Instant createdAt,
        Instant updatedAt) {
}

record AgentStepListResponse(
        List<AgentStepResponse> items,
        AgentPageResponse page) {
}

record AgentPageResponse(
        int page,
        int size,
        long totalCount,
        int totalPages) {
}

record AgentApprovalDecisionResponse(
        UUID approvalId,
        String status,
        String agentRunStatus,
        Instant updatedAt) {
}
