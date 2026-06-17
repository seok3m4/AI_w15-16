package com.memento.feature.agent;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.UUID;

record FastApiAgentRunRequest(
        String requestId,
        String runId,
        String jobId,
        String idempotencyKey,
        String goal,
        List<String> allowedTools,
        FastApiAgentUserContext userContext,
        String scopeSummary,
        Integer maxSteps) {
}

record FastApiAgentUserContext(
        String userId,
        String nickname) {
}

record FastApiAgentRunResponse(
        String provider,
        String model,
        String runId,
        String status,
        JsonNode result,
        List<FastApiAgentStepResult> steps,
        FastApiAgentPendingApproval pendingApproval,
        String failureReason) {
}

record FastApiAgentStepResult(
        int stepOrder,
        String toolName,
        String status,
        String inputSummary,
        String outputSummary,
        JsonNode error,
        FastApiAgentPendingApproval approval) {
}

record FastApiAgentPendingApproval(
        String type,
        String description,
        JsonNode payload) {
}
