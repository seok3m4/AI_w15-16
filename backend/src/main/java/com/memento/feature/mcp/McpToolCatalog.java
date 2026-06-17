package com.memento.feature.mcp;

import java.util.List;
import java.util.Map;

final class McpToolCatalog {

    private McpToolCatalog() {
    }

    static McpToolCatalogResponse catalog() {
        return new McpToolCatalogResponse(List.of(
                new McpToolCatalogItem("search_memories", "Search the authenticated user's memory chunks.", List.of(McpScopes.MEMORY_READ)),
                new McpToolCatalogItem("get_context_capsule", "Return a compact context capsule.", List.of(McpScopes.CAPSULE_READ)),
                new McpToolCatalogItem("summarize_recent_posts", "Summarize the user's recent posts.", List.of(McpScopes.MEMORY_READ)),
                new McpToolCatalogItem("search_friend_memories", "Search a consenting accepted friend's memories.", List.of(McpScopes.FRIEND_MEMORY_READ))));
    }

    static List<Map<String, Object>> mcpTools() {
        return catalog().items().stream()
                .map(item -> Map.<String, Object>of(
                        "name", item.name(),
                        "description", item.description(),
                        "inputSchema", inputSchema(item.name())))
                .toList();
    }

    private static Map<String, Object> inputSchema(String toolName) {
        if ("get_context_capsule".equals(toolName)) {
            return Map.of(
                    "type", "object",
                    "required", List.of("capsuleId"),
                    "properties", Map.of("capsuleId", Map.of("type", "string")));
        }
        if ("summarize_recent_posts".equals(toolName)) {
            return Map.of(
                    "type", "object",
                    "properties", Map.of(
                            "days", Map.of("type", "integer", "minimum", 1, "maximum", 30),
                            "limit", Map.of("type", "integer", "minimum", 1, "maximum", 20)));
        }
        if ("search_friend_memories".equals(toolName)) {
            return Map.of(
                    "type", "object",
                    "required", List.of("friendId", "query"),
                    "properties", Map.of(
                            "friendId", Map.of("type", "string"),
                            "query", Map.of("type", "string"),
                            "limit", Map.of("type", "integer", "minimum", 1, "maximum", 20)));
        }
        return Map.of(
                "type", "object",
                "required", List.of("query"),
                "properties", Map.of(
                        "query", Map.of("type", "string"),
                        "limit", Map.of("type", "integer", "minimum", 1, "maximum", 20)));
    }
}

