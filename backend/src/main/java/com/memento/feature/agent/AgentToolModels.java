package com.memento.feature.agent;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

record AgentToolExecutionRequest(
        @NotBlank String requestId,
        @NotBlank String runId,
        @Min(1) int stepOrder,
        String idempotencyKey,
        @NotBlank String toolName,
        Map<String, Object> input,
        @Valid @NotNull AgentToolUserContext userContext,
        String scopeSummary) {
}

record AgentToolUserContext(
        @NotBlank String userId,
        String nickname) {
}

record AgentToolExecutionResponse(
        String status,
        String outputSummary,
        Object output,
        boolean requiresApproval,
        AgentToolApproval approval,
        Object error,
        boolean retryable) {
}

record AgentToolApproval(
        String type,
        String description,
        Object payload) {
}
