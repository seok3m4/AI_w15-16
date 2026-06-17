package com.memento.feature.mcp;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.auth.AuthenticatedUserPrincipal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(McpManagementController.class)
class McpManagementControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CONNECTION_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-06-17T05:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private McpManagementService service;

    @Test
    void createServerCredentialReturnsOneTimeTokenForCurrentUser() throws Exception {
        McpCredentialCreateRequest request = new McpCredentialCreateRequest(
                "Claude Desktop",
                List.of("memory:read", "capsule:read"),
                "2026-07-17T05:00:00Z");
        given(service.createServerCredential(USER_ID, request))
                .willReturn(new McpCredentialCreateResponse(
                        CONNECTION_ID,
                        "Claude Desktop",
                        "server",
                        "active",
                        List.of("memory:read", "capsule:read"),
                        "mmt_mcp_abc123",
                        NOW,
                        Instant.parse("2026-07-17T05:00:00Z")));

        mockMvc.perform(post("/api/v1/mcp/server-credentials")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.connectionId").value(CONNECTION_ID.toString()))
                .andExpect(jsonPath("$.provider").value("server"))
                .andExpect(jsonPath("$.oneTimeToken").value("mmt_mcp_abc123"))
                .andExpect(jsonPath("$.scopes[0]").value("memory:read"));

        verify(service).createServerCredential(USER_ID, request);
    }

    @Test
    void listToolsReturnsServerToolCatalogAndRequiredScopes() throws Exception {
        given(service.listTools())
                .willReturn(new McpToolCatalogResponse(List.of(
                        new McpToolCatalogItem("search_memories", "Search my memories.", List.of("memory:read")),
                        new McpToolCatalogItem("get_context_capsule", "Read a context capsule.", List.of("capsule:read")))));

        mockMvc.perform(get("/api/v1/mcp/tools")
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("search_memories"))
                .andExpect(jsonPath("$.items[0].requiredScopes[0]").value("memory:read"))
                .andExpect(jsonPath("$.items[1].name").value("get_context_capsule"));
    }

    @Test
    void revokeConnectionDisablesCurrentUsersCredential() throws Exception {
        mockMvc.perform(delete("/api/v1/mcp/connections/{connectionId}", CONNECTION_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isNoContent());

        verify(service).revokeConnection(USER_ID, CONNECTION_ID);
    }

    @Test
    void listCallLogsReturnsMaskedMcpHistory() throws Exception {
        UUID logId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        given(service.listCallLogs(USER_ID, 0, 20))
                .willReturn(new McpCallLogListResponse(List.of(new McpCallLogSummaryResponse(
                        logId,
                        "search_memories",
                        "server_inbound",
                        "succeeded",
                        null,
                        NOW))));

        mockMvc.perform(get("/api/v1/mcp/call-logs")
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(logId.toString()))
                .andExpect(jsonPath("$.items[0].toolName").value("search_memories"))
                .andExpect(jsonPath("$.items[0].status").value("succeeded"));
    }

    @Test
    void createServerCredentialRejectsUnknownScope() throws Exception {
        given(service.createServerCredential(
                        USER_ID,
                        new McpCredentialCreateRequest("Bad", List.of("admin:all"), null)))
                .willThrow(new McpInvalidRequestException("Unsupported scope: admin:all"));

        mockMvc.perform(post("/api/v1/mcp/server-credentials")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Bad",
                                "scopes", List.of("admin:all")))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_MCP_REQUEST"));
    }
}
