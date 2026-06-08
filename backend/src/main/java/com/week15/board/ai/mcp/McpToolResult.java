package com.week15.board.ai.mcp;

import java.util.Map;

public record McpToolResult(
        String content,
        Map<String, Object> metadata
) {
}

