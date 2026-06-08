package com.week15.board.ai.rag;

import java.util.Map;

public record RetrievedDocument(
        String id,
        String content,
        double score,
        Map<String, Object> metadata
) {
}

