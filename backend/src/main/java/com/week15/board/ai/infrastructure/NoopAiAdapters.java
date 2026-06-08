package com.week15.board.ai.infrastructure;

import com.week15.board.ai.agent.AgentGateway;
import com.week15.board.ai.agent.AgentRequest;
import com.week15.board.ai.agent.AgentResult;
import com.week15.board.ai.mcp.McpClientGateway;
import com.week15.board.ai.mcp.McpToolRequest;
import com.week15.board.ai.mcp.McpToolResult;
import com.week15.board.ai.rag.RagService;
import com.week15.board.ai.rag.RetrievedDocument;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NoopAiAdapters {

    @Bean
    @ConditionalOnMissingBean
    RagService noopRagService() {
        return (query, topK) -> List.of();
    }

    @Bean
    @ConditionalOnMissingBean
    AgentGateway noopAgentGateway() {
        return (AgentRequest request) -> new AgentResult("", Map.of("adapter", "noop"));
    }

    @Bean
    @ConditionalOnMissingBean
    McpClientGateway noopMcpClientGateway() {
        return (McpToolRequest request) -> new McpToolResult("", Map.of("adapter", "noop"));
    }
}

