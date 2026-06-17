package com.memento.feature.agent;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
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

@WebMvcTest(AgentRunController.class)
class AgentRunControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID RUN_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID APPROVAL_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-17T03:10:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AgentRunService agentRunService;

    @Test
    void startAgentRunReturnsAcceptedPendingRunForCurrentUser() throws Exception {
        AgentRunStartRequest request = new AgentRunStartRequest(
                "최근 기록으로 주간 회고를 만들고 Notion에 저장해줘",
                List.of("search_memories", "summarize", "notion_export"));
        given(agentRunService.start(USER_ID, request))
                .willReturn(new AgentRunResponse(
                        RUN_ID,
                        request.goal(),
                        "pending",
                        false,
                        null,
                        List.of(),
                        null,
                        NOW,
                        NOW));

        mockMvc.perform(post("/api/v1/agent-runs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").value(RUN_ID.toString()))
                .andExpect(jsonPath("$.goal").value(request.goal()))
                .andExpect(jsonPath("$.status").value("pending"))
                .andExpect(jsonPath("$.requiresApproval").value(false));

        verify(agentRunService).start(USER_ID, request);
    }

    @Test
    void getAgentRunReturnsPendingApprovalsOnlyForCurrentUser() throws Exception {
        given(agentRunService.get(USER_ID, RUN_ID))
                .willReturn(new AgentRunResponse(
                        RUN_ID,
                        "Notion export",
                        "approval_required",
                        true,
                        null,
                        List.of(new AgentApprovalResponse(
                                APPROVAL_ID,
                                "external_write",
                                "Notion 페이지를 생성합니다.",
                                NOW)),
                        null,
                        NOW,
                        NOW));

        mockMvc.perform(get("/api/v1/agent-runs/{runId}", RUN_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("approval_required"))
                .andExpect(jsonPath("$.pendingApprovals[0].id").value(APPROVAL_ID.toString()))
                .andExpect(jsonPath("$.pendingApprovals[0].type").value("external_write"));
    }

    @Test
    void listAgentStepsReturnsStepTimelineForCurrentUser() throws Exception {
        given(agentRunService.listSteps(USER_ID, RUN_ID, 0, 20))
                .willReturn(new AgentStepListResponse(
                        List.of(new AgentStepResponse(
                                UUID.fromString("44444444-4444-4444-4444-444444444444"),
                                1,
                                "search_memories",
                                "succeeded",
                                "최근 7일 기록 검색",
                                "관련 게시글 4개 발견",
                                NOW,
                                NOW)),
                        new AgentPageResponse(0, 20, 1, 1)));

        mockMvc.perform(get("/api/v1/agent-runs/{runId}/steps", RUN_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].toolName").value("search_memories"))
                .andExpect(jsonPath("$.items[0].status").value("succeeded"))
                .andExpect(jsonPath("$.page.totalCount").value(1));
    }

    @Test
    void approveAndRejectPendingApprovalReturnUpdatedAgentStatus() throws Exception {
        given(agentRunService.approve(USER_ID, RUN_ID, APPROVAL_ID))
                .willReturn(new AgentApprovalDecisionResponse(APPROVAL_ID, "approved", "running", NOW));
        given(agentRunService.reject(USER_ID, RUN_ID, APPROVAL_ID))
                .willReturn(new AgentApprovalDecisionResponse(APPROVAL_ID, "rejected", "rejected", NOW));

        mockMvc.perform(post("/api/v1/agent-runs/{runId}/approvals/{approvalId}/approve", RUN_ID, APPROVAL_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalId").value(APPROVAL_ID.toString()))
                .andExpect(jsonPath("$.status").value("approved"))
                .andExpect(jsonPath("$.agentRunStatus").value("running"));

        mockMvc.perform(post("/api/v1/agent-runs/{runId}/approvals/{approvalId}/reject", RUN_ID, APPROVAL_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("rejected"))
                .andExpect(jsonPath("$.agentRunStatus").value("rejected"));
    }

    @Test
    void startAgentRunRejectsBlankGoal() throws Exception {
        mockMvc.perform(post("/api/v1/agent-runs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(Map.of(
                                "goal", " ",
                                "allowedTools", List.of("search_memories")))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AGENT_RUN_REQUEST"));
    }
}
