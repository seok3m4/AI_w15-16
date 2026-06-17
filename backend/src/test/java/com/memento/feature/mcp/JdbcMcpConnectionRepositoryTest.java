package com.memento.feature.mcp;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcMcpConnectionRepositoryTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CONNECTION_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-06-17T05:00:00Z");

    @Test
    void saveServerCredentialPersistsHashWithoutRawToken() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMcpConnectionRepository repository = new JdbcMcpConnectionRepository(jdbcTemplate);
        McpConnectionSecretInput input = new McpConnectionSecretInput(
                OWNER_ID,
                "Claude Desktop",
                "{\"scopes\":[\"memory:read\"]}",
                new byte[] {1, 2, 3},
                "hash:mcp_token",
                NOW.plusSeconds(60),
                NOW);
        when(jdbcTemplate.queryForObject(any(String.class), any(RowMapper.class), any()))
                .thenReturn(new McpConnectionRecord(
                        CONNECTION_ID,
                        OWNER_ID,
                        "Claude Desktop",
                        "server",
                        "server",
                        input.configJson(),
                        input.secretRef(),
                        "active",
                        input.expiresAt(),
                        NOW,
                        NOW));

        repository.saveServerCredential(input);

        verify(jdbcTemplate).update(
                org.mockito.ArgumentMatchers.contains("INSERT INTO mcp_connections"),
                any(UUID.class),
                eq(OWNER_ID),
                eq("Claude Desktop"),
                eq("server"),
                eq("server"),
                eq(input.configJson()),
                eq("hash:mcp_token"),
                eq("active"),
                eq(input.expiresAt()),
                eq(NOW),
                eq(NOW));
        verify(jdbcTemplate).update(
                org.mockito.ArgumentMatchers.contains("INSERT INTO mcp_connection_secrets"),
                any(UUID.class),
                eq(input.secretHash()),
                eq("HMAC-SHA256"),
                eq(NOW));
    }

    @Test
    void revokeDisablesOnlyCurrentUsersConnection() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMcpConnectionRepository repository = new JdbcMcpConnectionRepository(jdbcTemplate);

        repository.revoke(OWNER_ID, CONNECTION_ID, NOW);

        verify(jdbcTemplate).update(
                org.mockito.ArgumentMatchers.contains("WHERE id = ? AND owner_id = ?"),
                eq(NOW),
                eq(CONNECTION_ID),
                eq(OWNER_ID));
    }

    @Test
    void saveCallLogPersistsMaskedSummary() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMcpConnectionRepository repository = new JdbcMcpConnectionRepository(jdbcTemplate);
        McpCallLogInput input = new McpCallLogInput(
                CONNECTION_ID,
                null,
                OWNER_ID,
                "search_memories",
                "server_inbound",
                "{\"argumentKeys\":[\"query\"]}",
                "{\"isError\":false}",
                "succeeded",
                null,
                NOW);

        repository.saveCallLog(input);

        verify(jdbcTemplate).update(
                org.mockito.ArgumentMatchers.contains("INSERT INTO mcp_call_logs"),
                any(UUID.class),
                eq(CONNECTION_ID),
                eq(null),
                eq(OWNER_ID),
                eq("search_memories"),
                eq("server_inbound"),
                eq("{\"argumentKeys\":[\"query\"]}"),
                eq("{\"isError\":false}"),
                eq("succeeded"),
                eq(null),
                eq(NOW));
    }

    @Test
    void findCallLogsForOwnerReadsLatestLogs() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMcpConnectionRepository repository = new JdbcMcpConnectionRepository(jdbcTemplate);
        when(jdbcTemplate.query(any(String.class), any(RowMapper.class), eq(OWNER_ID), eq(20), eq(0)))
                .thenReturn(List.of(new McpCallLogRecord(
                        UUID.fromString("33333333-3333-3333-3333-333333333333"),
                        CONNECTION_ID,
                        OWNER_ID,
                        "search_memories",
                        "server_inbound",
                        "succeeded",
                        null,
                        NOW)));

        repository.findCallLogsForOwner(OWNER_ID, 0, 20);

        verify(jdbcTemplate).query(any(String.class), any(RowMapper.class), eq(OWNER_ID), eq(20), eq(0));
    }
}
