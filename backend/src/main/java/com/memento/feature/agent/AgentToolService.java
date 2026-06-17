package com.memento.feature.agent;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AgentToolService {

    private static final Set<String> APPROVAL_REQUIRED_TOOLS = Set.of(
            "notion_export",
            "create_post_draft");

    private final AgentRunRepository repository;

    AgentToolService(AgentRunRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    AgentToolExecutionResponse execute(String pathToolName, AgentToolExecutionRequest request) {
        if (!pathToolName.equals(request.toolName())) {
            return failed("AGENT_TOOL_NAME_MISMATCH", "Tool path and request toolName do not match.", false);
        }
        UUID runId = parseUuid(request.runId());
        UUID userId = parseUuid(request.userContext().userId());
        AgentRunRecord run = repository.findForOwner(userId, runId)
                .orElseThrow(() -> new AgentRunNotFoundException(runId));
        if (!run.allowedTools().contains(pathToolName)) {
            return failed("AGENT_TOOL_NOT_ALLOWED", "Tool is not allowed for this run.", false);
        }
        if (!"running".equals(run.status())) {
            return failed("AGENT_RUN_NOT_RUNNING", "Agent run is not accepting tool calls.", true);
        }
        if (APPROVAL_REQUIRED_TOOLS.contains(pathToolName)) {
            return new AgentToolExecutionResponse(
                    "approval_required",
                    "사용자 승인이 필요합니다.",
                    null,
                    true,
                    new AgentToolApproval(
                            "notion_export".equals(pathToolName) ? "external_write" : "post_create",
                            approvalDescription(pathToolName),
                            Map.of("toolName", pathToolName, "inputSummary", safeInputSummary(request))),
                    null,
                    false);
        }
        return new AgentToolExecutionResponse(
                "succeeded",
                pathToolName + " 실행 완료",
                Map.of("toolName", pathToolName),
                false,
                null,
                null,
                false);
    }

    private AgentToolExecutionResponse failed(String code, String message, boolean retryable) {
        return new AgentToolExecutionResponse(
                "failed",
                message,
                null,
                false,
                null,
                Map.of("code", code, "message", message),
                retryable);
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (RuntimeException exception) {
            throw new AgentRunInvalidRequestException("Invalid UUID in agent tool request.");
        }
    }

    private String approvalDescription(String toolName) {
        if ("notion_export".equals(toolName)) {
            return "Notion 페이지를 생성합니다.";
        }
        return "게시물 초안을 생성합니다.";
    }

    private String safeInputSummary(AgentToolExecutionRequest request) {
        Object goal = request.input() == null ? null : request.input().get("goal");
        if (goal instanceof String text) {
            return text.length() > 120 ? text.substring(0, 120) : text;
        }
        return request.toolName();
    }
}
