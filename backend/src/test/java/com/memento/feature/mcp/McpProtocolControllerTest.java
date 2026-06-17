package com.memento.feature.mcp;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(McpProtocolController.class)
class McpProtocolControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private McpProtocolService protocolService;

    @Test
    void handleMcpToolsListRequiresScopedMcpBearerToken() throws Exception {
        Map<String, Object> response = Map.of(
                "jsonrpc", "2.0",
                "id", 1,
                "result", Map.of("tools", ListFixtures.tools()));
        given(protocolService.handle(eq("mmt_mcp_valid"), any())).willReturn(response);

        mockMvc.perform(post("/mcp")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer mmt_mcp_valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "jsonrpc", "2.0",
                                "id", 1,
                                "method", "tools/list"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jsonrpc").value("2.0"))
                .andExpect(jsonPath("$.result.tools[0].name").value("search_memories"));

        verify(protocolService).handle(eq("mmt_mcp_valid"), any());
    }

    @Test
    void handleMcpRequestRejectsMissingBearerToken() throws Exception {
        mockMvc.perform(post("/mcp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "jsonrpc", "2.0",
                                "id", 1,
                                "method", "tools/list"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("MCP_UNAUTHORIZED"));
    }

    private static class ListFixtures {
        static java.util.List<Map<String, Object>> tools() {
            return java.util.List.of(Map.of(
                    "name", "search_memories",
                    "description", "Search my memories.",
                    "inputSchema", Map.of("type", "object")));
        }
    }
}
