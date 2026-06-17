package com.memento.feature.mcp;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcMcpConnectionRepository implements McpConnectionRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcMcpConnectionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public McpConnectionRecord saveServerCredential(McpConnectionSecretInput input) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                """
                        INSERT INTO mcp_connections (
                            id, owner_id, name, provider, direction, config, secret_ref,
                            status, expires_at, created_at, updated_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?)
                        """,
                id,
                input.ownerId(),
                input.name(),
                "server",
                "server",
                input.configJson(),
                input.secretRef(),
                "active",
                input.expiresAt(),
                input.now(),
                input.now());
        jdbcTemplate.update(
                """
                        INSERT INTO mcp_connection_secrets (
                            connection_id, secret_hash, algorithm, created_at
                        )
                        VALUES (?, ?, ?, ?)
                        """,
                id,
                input.secretHash(),
                "HMAC-SHA256",
                input.now());
        return findById(id).orElseThrow();
    }

    @Override
    public Optional<McpConnectionRecord> findActiveServerBySecretHash(byte[] secretHash) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                            SELECT c.id, c.owner_id, c.name, c.provider, c.direction,
                                   c.config::text AS config_json, c.secret_ref, c.status,
                                   c.expires_at, c.created_at, c.updated_at
                            FROM mcp_connections c
                            JOIN mcp_connection_secrets s ON s.connection_id = c.id
                            WHERE s.secret_hash = ?
                              AND c.direction = 'server'
                              AND c.status = 'active'
                            """,
                    this::mapRecord,
                    secretHash));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    @Override
    public List<McpConnectionRecord> findForOwner(UUID ownerId) {
        return jdbcTemplate.query(
                """
                        SELECT id, owner_id, name, provider, direction, config::text AS config_json,
                               secret_ref, status, expires_at, created_at, updated_at
                        FROM mcp_connections
                        WHERE owner_id = ?
                        ORDER BY created_at DESC
                        """,
                this::mapRecord,
                ownerId);
    }

    @Override
    public void revoke(UUID ownerId, UUID connectionId, Instant now) {
        jdbcTemplate.update(
                """
                        UPDATE mcp_connections
                        SET status = 'disabled', updated_at = ?
                        WHERE id = ? AND owner_id = ?
                        """,
                now,
                connectionId,
                ownerId);
    }

    @Override
    public void saveCallLog(McpCallLogInput input) {
        jdbcTemplate.update(
                """
                        INSERT INTO mcp_call_logs (
                            id, connection_id, run_id, caller_user_id, tool_name, direction,
                            input, output, status, error, created_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?::jsonb, ?)
                        """,
                UUID.randomUUID(),
                input.connectionId(),
                input.runId(),
                input.callerUserId(),
                input.toolName(),
                input.direction(),
                input.inputJson(),
                input.outputJson(),
                input.status(),
                input.errorJson(),
                input.createdAt());
    }

    @Override
    public List<McpCallLogRecord> findCallLogsForOwner(UUID ownerId, int page, int size) {
        int safeSize = Math.max(1, Math.min(size, 100));
        int offset = Math.max(0, page) * safeSize;
        return jdbcTemplate.query(
                """
                        SELECT id, connection_id, caller_user_id, tool_name, direction, status,
                               error ->> 'code' AS error_code, created_at
                        FROM mcp_call_logs
                        WHERE caller_user_id = ?
                        ORDER BY created_at DESC
                        LIMIT ? OFFSET ?
                        """,
                this::mapCallLogRecord,
                ownerId,
                safeSize,
                offset);
    }

    private Optional<McpConnectionRecord> findById(UUID id) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                            SELECT id, owner_id, name, provider, direction, config::text AS config_json,
                                   secret_ref, status, expires_at, created_at, updated_at
                            FROM mcp_connections
                            WHERE id = ?
                            """,
                    this::mapRecord,
                    id));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    private McpConnectionRecord mapRecord(ResultSet rs, int rowNum) throws SQLException {
        return new McpConnectionRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("owner_id", UUID.class),
                rs.getString("name"),
                rs.getString("provider"),
                rs.getString("direction"),
                rs.getString("config_json"),
                rs.getString("secret_ref"),
                rs.getString("status"),
                rs.getObject("expires_at", Instant.class),
                rs.getObject("created_at", Instant.class),
                rs.getObject("updated_at", Instant.class));
    }

    private McpCallLogRecord mapCallLogRecord(ResultSet rs, int rowNum) throws SQLException {
        return new McpCallLogRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("connection_id", UUID.class),
                rs.getObject("caller_user_id", UUID.class),
                rs.getString("tool_name"),
                rs.getString("direction"),
                rs.getString("status"),
                rs.getString("error_code"),
                rs.getObject("created_at", Instant.class));
    }
}
