package com.memento.feature.mcp;

import com.memento.feature.capsule.McpContextCapsulePort;
import com.memento.feature.memory.McpMemoryToolPort;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class McpToolService {

    private final McpMemoryToolPort memoryToolPort;
    private final McpContextCapsulePort capsulePort;

    McpToolService(
            McpMemoryToolPort memoryToolPort,
            McpContextCapsulePort capsulePort) {
        this.memoryToolPort = memoryToolPort;
        this.capsulePort = capsulePort;
    }

    @Transactional
    McpToolResult call(McpCredentialContext context, String toolName, Map<String, Object> arguments) {
        return switch (toolName) {
            case "search_memories" -> searchMemories(context, arguments);
            case "get_context_capsule" -> getContextCapsule(context, arguments);
            case "summarize_recent_posts" -> summarizeRecentPosts(context, arguments);
            case "search_friend_memories" -> searchFriendMemories(context, arguments);
            default -> throw new McpInvalidRequestException("Unsupported MCP tool: " + toolName);
        };
    }

    private McpToolResult searchMemories(McpCredentialContext context, Map<String, Object> arguments) {
        requireScope(context, McpScopes.MEMORY_READ);
        String query = requiredString(arguments, "query");
        int limit = intValue(arguments, "limit", 10);
        McpMemoryToolPort.SearchResult result = memoryToolPort.searchMemories(context.ownerId(), query, limit);
        Map<String, Object> structured = Map.of(
                "query", result.query(),
                "scope", result.scope(),
                "results", result.results().stream().map(this::memoryResult).toList());
        return new McpToolResult(structured, "Found " + result.results().size() + " memory results.", false);
    }

    private McpToolResult getContextCapsule(McpCredentialContext context, Map<String, Object> arguments) {
        requireScope(context, McpScopes.CAPSULE_READ);
        UUID capsuleId = uuidValue(requiredString(arguments, "capsuleId"));
        McpContextCapsulePort.CompactContext result = capsulePort.getCompactContext(context.ownerId(), capsuleId);
        Map<String, Object> structured = Map.of(
                "purpose", result.purpose(),
                "summary", result.summary(),
                "keyFacts", result.keyFacts(),
                "sourcePostIds", result.sourcePostIds().stream().map(UUID::toString).toList(),
                "tags", result.tags());
        return new McpToolResult(structured, "Loaded context capsule.", false);
    }

    private McpToolResult summarizeRecentPosts(McpCredentialContext context, Map<String, Object> arguments) {
        requireScope(context, McpScopes.MEMORY_READ);
        int days = intValue(arguments, "days", 7);
        int limit = intValue(arguments, "limit", 10);
        McpMemoryToolPort.RecentPostsSummary result =
                memoryToolPort.summarizeRecentPosts(context.ownerId(), days, limit);
        Map<String, Object> structured = Map.of(
                "days", result.days(),
                "limit", result.limit(),
                "summary", result.summary(),
                "posts", result.posts().stream().map(post -> Map.of(
                        "postId", post.postId().toString(),
                        "title", post.title(),
                        "preview", post.preview(),
                        "createdAt", post.createdAt().toString())).toList());
        return new McpToolResult(structured, result.summary(), false);
    }

    private McpToolResult searchFriendMemories(McpCredentialContext context, Map<String, Object> arguments) {
        requireScope(context, McpScopes.FRIEND_MEMORY_READ);
        UUID friendId = uuidValue(requiredString(arguments, "friendId"));
        String query = requiredString(arguments, "query");
        int limit = intValue(arguments, "limit", 10);
        McpMemoryToolPort.FriendSearchResult result =
                memoryToolPort.searchFriendMemories(context.ownerId(), friendId, query, limit);
        Map<String, Object> structured = Map.of(
                "friendId", result.friendId().toString(),
                "query", result.query(),
                "usedFriendContext", result.usedFriendContext(),
                "results", result.results().stream().map(this::memoryResult).toList());
        return new McpToolResult(structured, "Found " + result.results().size() + " friend memory results.", false);
    }

    private void requireScope(McpCredentialContext context, String scope) {
        if (!context.hasScope(scope)) {
            throw new McpForbiddenException("Required MCP scope is missing: " + scope);
        }
    }

    private String requiredString(Map<String, Object> arguments, String key) {
        Object value = arguments.get(key);
        if (!(value instanceof String text) || text.isBlank()) {
            throw new McpInvalidRequestException(key + " is required.");
        }
        return text.trim();
    }

    private int intValue(Map<String, Object> arguments, String key, int defaultValue) {
        Object value = arguments.get(key);
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        throw new McpInvalidRequestException(key + " must be a number.");
    }

    private UUID uuidValue(String value) {
        try {
            return UUID.fromString(value);
        } catch (RuntimeException exception) {
            throw new McpInvalidRequestException("Invalid UUID: " + value);
        }
    }

    private Map<String, Object> memoryResult(McpMemoryToolPort.ResultItem item) {
        return Map.of(
                "postId", item.postId().toString(),
                "chunkId", item.chunkId().toString(),
                "ownerUserId", item.ownerUserId().toString(),
                "ownerNickname", item.ownerNickname(),
                "title", item.title(),
                "snippet", item.snippet(),
                "score", item.score(),
                "sourceType", item.sourceType(),
                "createdAt", item.createdAt().toString());
    }
}

record McpToolResult(
        Map<String, Object> structuredContent,
        String text,
        boolean error) {
}

