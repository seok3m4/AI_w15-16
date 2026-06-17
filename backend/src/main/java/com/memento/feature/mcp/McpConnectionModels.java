package com.memento.feature.mcp;

import java.time.Instant;
import java.util.UUID;

record McpConnectionRecord(
        UUID id,
        UUID ownerId,
        String name,
        String provider,
        String direction,
        String configJson,
        String secretRef,
        String status,
        Instant expiresAt,
        Instant createdAt,
        Instant updatedAt) {
}

record McpConnectionSecretInput(
        UUID ownerId,
        String name,
        String configJson,
        byte[] secretHash,
        String secretRef,
        Instant expiresAt,
        Instant now) {
}

record McpCredentialContext(
        UUID connectionId,
        UUID ownerId,
        String name,
        java.util.List<String> scopes) {

    boolean hasScope(String scope) {
        return scopes.contains(scope);
    }
}

record McpCallLogInput(
        UUID connectionId,
        UUID runId,
        UUID callerUserId,
        String toolName,
        String direction,
        String inputJson,
        String outputJson,
        String status,
        String errorJson,
        Instant createdAt) {
}

record McpCallLogRecord(
        UUID id,
        UUID connectionId,
        UUID callerUserId,
        String toolName,
        String direction,
        String status,
        String errorCode,
        Instant createdAt) {
}
