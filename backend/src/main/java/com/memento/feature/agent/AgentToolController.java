package com.memento.feature.agent;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/v1/agent-tools")
class AgentToolController {

    private final AgentToolService agentToolService;

    AgentToolController(AgentToolService agentToolService) {
        this.agentToolService = agentToolService;
    }

    @PostMapping("/{toolName}")
    AgentToolExecutionResponse execute(
            @PathVariable String toolName,
            @Valid @RequestBody AgentToolExecutionRequest request) {
        return agentToolService.execute(toolName, request);
    }
}
