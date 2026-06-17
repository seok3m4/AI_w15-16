package com.memento.feature.mcp;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface McpConnectionRepository {

    McpConnectionRecord saveServerCredential(McpConnectionSecretInput input);

    Optional<McpConnectionRecord> findActiveServerBySecretHash(byte[] secretHash);

    default List<McpConnectionRecord> findForOwner(UUID ownerId) {
        return List.of();
    }

    void revoke(UUID ownerId, UUID connectionId, Instant now);

    default void saveCallLog(McpCallLogInput input) {
    }

    default List<McpCallLogRecord> findCallLogsForOwner(UUID ownerId, int page, int size) {
        return List.of();
    }
}
