package com.week15.board.ai.application;

import com.week15.board.ai.agent.AgentGateway;
import com.week15.board.ai.config.AiProperties;
import com.week15.board.ai.mcp.McpClientGateway;
import com.week15.board.ai.rag.RagService;
import com.week15.board.ai.rag.RetrievedDocument;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BoardAiFacade {

    private final AiProperties aiProperties;
    private final RagService ragService;
    private final AgentGateway agentGateway;
    private final McpClientGateway mcpClientGateway;

    public BoardAiFacade(
            AiProperties aiProperties,
            RagService ragService,
            AgentGateway agentGateway,
            McpClientGateway mcpClientGateway
    ) {
        this.aiProperties = aiProperties;
        this.ragService = ragService;
        this.agentGateway = agentGateway;
        this.mcpClientGateway = mcpClientGateway;
    }

    public List<RetrievedDocument> retrieveBoardContext(String query) {
        int topK = aiProperties.rag() == null ? 5 : aiProperties.rag().topK();
        return ragService.retrieve(query, topK);
    }

    public AgentGateway agentGateway() {
        return agentGateway;
    }

    public McpClientGateway mcpClientGateway() {
        return mcpClientGateway;
    }
}

