package com.week15.board.ai.agent;

import java.util.Map;

public record AgentRequest(
        String task,
        String input,
        Map<String, Object> context
) {
}

