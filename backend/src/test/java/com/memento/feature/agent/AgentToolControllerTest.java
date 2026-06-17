package com.memento.feature.agent;

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
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AgentToolController.class)
class AgentToolControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AgentToolService agentToolService;

    @Test
    void executeInternalToolReturnsStandardToolResponse() throws Exception {
        AgentToolExecutionRequest request = toolRequest("search_memories");
        given(agentToolService.execute("search_memories", request))
                .willReturn(new AgentToolExecutionResponse(
                        "succeeded",
                        "memory 검색 완료",
                        Map.of("resultCount", 2),
                        false,
                        null,
                        null,
                        false));

        mockMvc.perform(post("/internal/v1/agent-tools/search_memories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("succeeded"))
                .andExpect(jsonPath("$.outputSummary").value("memory 검색 완료"))
                .andExpect(jsonPath("$.output.resultCount").value(2))
                .andExpect(jsonPath("$.requiresApproval").value(false));

        verify(agentToolService).execute("search_memories", request);
    }

    @Test
    void executeInternalWriteToolCanReturnApprovalRequiredWithoutSideEffect() throws Exception {
        AgentToolExecutionRequest request = toolRequest("notion_export");
        given(agentToolService.execute("notion_export", request))
                .willReturn(new AgentToolExecutionResponse(
                        "approval_required",
                        "사용자 승인이 필요합니다.",
                        null,
                        true,
                        new AgentToolApproval("external_write", "Notion 페이지를 생성합니다.", Map.of("toolName", "notion_export")),
                        null,
                        false));

        mockMvc.perform(post("/internal/v1/agent-tools/notion_export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("approval_required"))
                .andExpect(jsonPath("$.requiresApproval").value(true))
                .andExpect(jsonPath("$.approval.type").value("external_write"));
    }

    private AgentToolExecutionRequest toolRequest(String toolName) {
        return new AgentToolExecutionRequest(
                "req-1",
                "22222222-2222-2222-2222-222222222222",
                1,
                "idem-1",
                toolName,
                Map.of("query", "weekly review"),
                new AgentToolUserContext("11111111-1111-1111-1111-111111111111", "cutan"),
                "본인 memory만 사용 가능");
    }
}
