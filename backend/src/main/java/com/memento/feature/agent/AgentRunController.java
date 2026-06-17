package com.memento.feature.agent;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agent-runs")
class AgentRunController {

    private final AgentRunService agentRunService;

    AgentRunController(AgentRunService agentRunService) {
        this.agentRunService = agentRunService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    AgentRunResponse start(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @Valid @RequestBody AgentRunStartRequest request) {
        return agentRunService.start(currentUser.userId(), request);
    }

    @GetMapping("/{runId}")
    AgentRunResponse get(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID runId) {
        return agentRunService.get(currentUser.userId(), runId);
    }

    @GetMapping("/{runId}/steps")
    AgentStepListResponse listSteps(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID runId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return agentRunService.listSteps(currentUser.userId(), runId, page, size);
    }

    @PostMapping("/{runId}/approvals/{approvalId}/approve")
    AgentApprovalDecisionResponse approve(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID runId,
            @PathVariable UUID approvalId) {
        return agentRunService.approve(currentUser.userId(), runId, approvalId);
    }

    @PostMapping("/{runId}/approvals/{approvalId}/reject")
    AgentApprovalDecisionResponse reject(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID runId,
            @PathVariable UUID approvalId) {
        return agentRunService.reject(currentUser.userId(), runId, approvalId);
    }
}
