package com.memento.feature.mcp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class McpProtocolServiceTest {

    private static final UUID CONNECTION_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");

    private final McpTokenService tokenService = Mockito.mock(McpTokenService.class);
    private final McpToolService toolService = Mockito.mock(McpToolService.class);
    private final McpConnectionRepository repository = Mockito.mock(McpConnectionRepository.class);
    private final McpProtocolService service = new McpProtocolService(tokenService, toolService, repository);

    @Test
    void toolsCallExecutesRequestedToolWhenCredentialHasRequiredScope() {
        McpCredentialContext context = new McpCredentialContext(
                CONNECTION_ID,
                OWNER_ID,
                "Claude Desktop",
                List.of("memory:read"));
        given(tokenService.resolve("token")).willReturn(Optional.of(context));
        given(toolService.call(context, "search_memories", Map.of("query", "jwt", "limit", 5)))
                .willReturn(new McpToolResult(
                        Map.of("query", "jwt", "results", List.of(Map.of("title", "JWT"))),
                        "Found 1 memory result.",
                        false));

        Map<String, Object> response = service.handle("token", Map.of(
                "jsonrpc", "2.0",
                "id", 7,
                "method", "tools/call",
                "params", Map.of(
                        "name", "search_memories",
                        "arguments", Map.of("query", "jwt", "limit", 5))));

        assertThat(response).containsEntry("jsonrpc", "2.0");
        assertThat(response).containsEntry("id", 7);
        Map<?, ?> result = (Map<?, ?>) response.get("result");
        assertThat(result.get("structuredContent")).isEqualTo(Map.of(
                "query", "jwt",
                "results", List.of(Map.of("title", "JWT"))));
        assertThat(result.get("isError")).isEqualTo(false);
        verify(repository).saveCallLog(org.mockito.ArgumentMatchers.argThat(input ->
                input.connectionId().equals(CONNECTION_ID)
                        && input.callerUserId().equals(OWNER_ID)
                        && input.toolName().equals("search_memories")
                        && input.status().equals("succeeded")
                        && input.inputJson().contains("argumentKeys")
                        && !input.inputJson().contains("jwt")
                        && input.createdAt().isBefore(Instant.now().plusSeconds(5))));
    }

    @Test
    void toolsCallReturnsJsonRpcErrorForMalformedParams() {
        given(tokenService.resolve("token")).willReturn(Optional.of(new McpCredentialContext(
                CONNECTION_ID,
                OWNER_ID,
                "Claude Desktop",
                List.of("memory:read"))));

        Map<String, Object> response = service.handle("token", Map.of(
                "jsonrpc", "2.0",
                "id", 7,
                "method", "tools/call",
                "params", Map.of("name", "search_memories")));

        Map<?, ?> error = (Map<?, ?>) response.get("error");
        assertThat(error.get("code")).isEqualTo(-32602);
        verify(repository).saveCallLog(org.mockito.ArgumentMatchers.argThat(input ->
                input.toolName().equals("__invalid__")
                        && input.status().equals("failed")
                        && input.errorJson().contains("-32602")));
    }
}
