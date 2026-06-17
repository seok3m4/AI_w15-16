package com.memento.feature.mcp;

import java.util.Map;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class McpProtocolService {

    private final McpTokenService tokenService;
    private final McpToolService toolService;
    private final McpConnectionRepository connectionRepository;

    McpProtocolService(
            McpTokenService tokenService,
            McpToolService toolService,
            McpConnectionRepository connectionRepository) {
        this.tokenService = tokenService;
        this.toolService = toolService;
        this.connectionRepository = connectionRepository;
    }

    @Transactional
    Map<String, Object> handle(String rawToken, Map<String, Object> request) {
        McpCredentialContext context = tokenService.resolve(rawToken)
                .orElseThrow(McpUnauthorizedException::new);
        Object id = request.get("id");
        String method = request.get("method") instanceof String value ? value : "";
        if ("initialize".equals(method)) {
            return response(id, Map.of(
                    "protocolVersion", "2025-11-25",
                    "serverInfo", Map.of("name", "Memento MCP Server", "version", "0.1.0"),
                    "capabilities", Map.of("tools", Map.of())));
        }
        if ("tools/list".equals(method)) {
            return response(id, Map.of("tools", McpToolCatalog.mcpTools()));
        }
        if ("tools/call".equals(method)) {
            return handleToolsCall(id, context, request.get("params"));
        }
        return error(id, -32601, "Method not found");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> handleToolsCall(Object id, McpCredentialContext context, Object rawParams) {
        if (!(rawParams instanceof Map<?, ?> params)
                || !(params.get("name") instanceof String toolName)
                || !(params.get("arguments") instanceof Map<?, ?> arguments)) {
            saveLog(context, "__invalid__", "failed", "{\"argumentKeys\":[]}", null,
                    "{\"code\":\"-32602\",\"message\":\"Invalid tools/call params\"}");
            return error(id, -32602, "Invalid tools/call params");
        }
        try {
            McpToolResult toolResult = toolService.call(
                    context,
                    toolName,
                    (Map<String, Object>) arguments);
            saveLog(
                    context,
                    toolName,
                    toolResult.error() ? "failed" : "succeeded",
                    maskedInput(arguments),
                    "{\"hasStructuredContent\":true,\"isError\":" + toolResult.error() + "}",
                    null);
            return response(id, Map.of(
                    "content", java.util.List.of(Map.of("type", "text", "text", toolResult.text())),
                    "structuredContent", toolResult.structuredContent(),
                    "isError", toolResult.error()));
        } catch (McpForbiddenException exception) {
            saveLog(context, toolName, "failed", maskedInput(arguments), null,
                    errorJson("-32003", exception.getMessage()));
            return error(id, -32003, exception.getMessage());
        } catch (McpInvalidRequestException exception) {
            saveLog(context, toolName, "failed", maskedInput(arguments), null,
                    errorJson("-32602", exception.getMessage()));
            return error(id, -32602, exception.getMessage());
        }
    }

    private void saveLog(
            McpCredentialContext context,
            String toolName,
            String status,
            String inputJson,
            String outputJson,
            String errorJson) {
        connectionRepository.saveCallLog(new McpCallLogInput(
                context.connectionId(),
                null,
                context.ownerId(),
                toolName,
                "server_inbound",
                inputJson,
                outputJson,
                status,
                errorJson,
                Instant.now()));
    }

    private String maskedInput(Map<?, ?> arguments) {
        String keys = arguments.keySet()
                .stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .sorted()
                .map(this::jsonString)
                .collect(java.util.stream.Collectors.joining(","));
        return "{\"argumentKeys\":[" + keys + "]}";
    }

    private String errorJson(String code, String message) {
        return "{\"code\":" + jsonString(code) + ",\"message\":" + jsonString(message) + "}";
    }

    private String jsonString(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private Map<String, Object> response(Object id, Map<String, Object> result) {
        return Map.of("jsonrpc", "2.0", "id", id, "result", result);
    }

    private Map<String, Object> error(Object id, int code, String message) {
        return Map.of(
                "jsonrpc", "2.0",
                "id", id,
                "error", Map.of("code", code, "message", message));
    }
}
