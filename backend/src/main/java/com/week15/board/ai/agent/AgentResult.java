package com.week15.board.ai.agent;

import java.util.Map;

public record AgentResult(
        String output,
        Map<String, Object> metadata
) {
}

