package com.week15.board.ai.mcp;

import java.util.Map;

public record McpToolRequest(
        String serverName,
        String toolName,
        Map<String, Object> arguments
) {
}

