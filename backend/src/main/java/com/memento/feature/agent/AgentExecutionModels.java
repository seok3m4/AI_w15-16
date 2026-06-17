package com.memento.feature.agent;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;

record NewAgentStep(
        UUID runId,
        int stepOrder,
        String toolName,
        String status,
        String inputSummary,
        String outputSummary,
        JsonNode error) {
}

record NewAgentApproval(
        UUID runId,
        String type,
        String description,
        JsonNode payload) {
}

record NewToolCallLog(
        UUID runId,
        UUID stepId,
        UUID callerUserId,
        String toolName,
        JsonNode input,
        JsonNode output,
        String status,
        JsonNode error) {
}
