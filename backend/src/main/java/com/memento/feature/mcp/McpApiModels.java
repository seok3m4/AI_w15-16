package com.memento.feature.mcp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

record McpCredentialCreateRequest(
        @NotBlank String name,
        @Size(min = 1, max = 10) List<String> scopes,
        String expiresAt) {
}

record McpCredentialCreateResponse(
        UUID connectionId,
        String name,
        String provider,
        String status,
        List<String> scopes,
        String oneTimeToken,
        Instant createdAt,
        Instant expiresAt) {
}

record McpToolCatalogResponse(List<McpToolCatalogItem> items) {
}

record McpToolCatalogItem(
        String name,
        String description,
        List<String> requiredScopes) {
}

record McpConnectionSummaryResponse(
        UUID id,
        String name,
        String provider,
        String direction,
        String status,
        List<String> scopes,
        Instant createdAt,
        Instant updatedAt) {

    static McpConnectionSummaryResponse from(McpConnectionRecord record) {
        return new McpConnectionSummaryResponse(
                record.id(),
                record.name(),
                record.provider(),
                record.direction(),
                record.status(),
                McpScopes.fromConfigJson(record.configJson()),
                record.createdAt(),
                record.updatedAt());
    }
}

record McpConnectionListResponse(List<McpConnectionSummaryResponse> items) {
}

record McpCallLogSummaryResponse(
        UUID id,
        String toolName,
        String direction,
        String status,
        String errorCode,
        Instant createdAt) {

    static McpCallLogSummaryResponse from(McpCallLogRecord record) {
        return new McpCallLogSummaryResponse(
                record.id(),
                record.toolName(),
                record.direction(),
                record.status(),
                record.errorCode(),
                record.createdAt());
    }
}

record McpCallLogListResponse(List<McpCallLogSummaryResponse> items) {
}
