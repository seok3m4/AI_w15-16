package com.memento.feature.mcp;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

final class McpScopes {

    static final String MEMORY_READ = "memory:read";
    static final String CAPSULE_READ = "capsule:read";
    static final String FRIEND_MEMORY_READ = "friend_memory:read";

    private static final Set<String> SUPPORTED = Set.of(MEMORY_READ, CAPSULE_READ, FRIEND_MEMORY_READ);

    private McpScopes() {
    }

    static List<String> normalize(List<String> scopes) {
        if (scopes == null || scopes.isEmpty()) {
            throw new McpInvalidRequestException("scopes must not be empty.");
        }
        List<String> normalized = new LinkedHashSet<>(scopes.stream()
                .map(scope -> scope == null ? "" : scope.trim())
                .filter(scope -> !scope.isBlank())
                .toList()).stream().toList();
        if (normalized.isEmpty()) {
            throw new McpInvalidRequestException("scopes must not be empty.");
        }
        for (String scope : normalized) {
            if (!SUPPORTED.contains(scope)) {
                throw new McpInvalidRequestException("Unsupported scope: " + scope);
            }
        }
        return normalized;
    }

    static String toConfigJson(List<String> scopes) {
        String values = scopes.stream()
                .map(scope -> "\"" + scope + "\"")
                .collect(java.util.stream.Collectors.joining(","));
        return "{\"scopes\":[" + values + "]}";
    }

    static List<String> fromConfigJson(String configJson) {
        if (configJson == null || configJson.isBlank()) {
            return List.of();
        }
        return SUPPORTED.stream()
                .filter(scope -> configJson.contains("\"" + scope + "\""))
                .sorted()
                .toList();
    }
}

