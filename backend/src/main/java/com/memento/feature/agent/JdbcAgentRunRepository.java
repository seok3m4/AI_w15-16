package com.memento.feature.agent;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
class JdbcAgentRunRepository implements AgentRunRepository, AgentExecutionRepository {

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {
    };

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    JdbcAgentRunRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public AgentRunRecord saveNew(UUID ownerId, String goal, List<String> allowedTools, Instant now) {
        UUID runId = UUID.randomUUID();
        return jdbcTemplate.queryForObject(
                """
                INSERT INTO agent_runs (id, owner_id, goal, allowed_tools, status, created_at, updated_at)
                VALUES (?, ?, ?, ?::jsonb, 'pending', ?, ?)
                RETURNING *
                """,
                runRowMapper(),
                runId,
                ownerId,
                goal,
                toJson(objectMapper.valueToTree(allowedTools)),
                Timestamp.from(now),
                Timestamp.from(now));
    }

    @Override
    public void attachJob(UUID runId, UUID jobId, Instant now) {
        jdbcTemplate.update(
                "UPDATE agent_runs SET job_id = ?, updated_at = ? WHERE id = ?",
                jobId,
                Timestamp.from(now),
                runId);
    }

    @Override
    public Optional<AgentRunRecord> findForOwner(UUID ownerId, UUID runId) {
        return jdbcTemplate.query(
                "SELECT * FROM agent_runs WHERE owner_id = ? AND id = ?",
                runRowMapper(),
                ownerId,
                runId).stream().findFirst();
    }

    @Override
    public Optional<AgentRunRecord> findForExecution(UUID ownerId, UUID runId) {
        return findForOwner(ownerId, runId);
    }

    @Override
    public List<AgentApprovalRecord> findPendingApprovals(UUID runId) {
        return jdbcTemplate.query(
                """
                SELECT *
                FROM agent_approvals
                WHERE run_id = ?
                  AND status = 'pending'
                ORDER BY requested_at ASC
                """,
                approvalRowMapper(),
                runId);
    }

    @Override
    public Optional<AgentApprovalRecord> findPendingApprovalForOwner(UUID ownerId, UUID runId, UUID approvalId) {
        return jdbcTemplate.query(
                """
                SELECT approval.*
                FROM agent_approvals approval
                JOIN agent_runs run ON run.id = approval.run_id
                WHERE run.owner_id = ?
                  AND run.id = ?
                  AND approval.id = ?
                  AND approval.status = 'pending'
                """,
                approvalRowMapper(),
                ownerId,
                runId,
                approvalId).stream().findFirst();
    }

    @Override
    public List<AgentStepRecord> findStepsForOwner(UUID ownerId, UUID runId, int limit, int offset) {
        return jdbcTemplate.query(
                """
                SELECT step.*
                FROM agent_steps step
                JOIN agent_runs run ON run.id = step.run_id
                WHERE run.owner_id = ?
                  AND run.id = ?
                ORDER BY step.step_order ASC
                LIMIT ? OFFSET ?
                """,
                stepRowMapper(),
                ownerId,
                runId,
                limit,
                offset);
    }

    @Override
    public long countStepsForOwner(UUID ownerId, UUID runId) {
        Long count = jdbcTemplate.queryForObject(
                """
                SELECT count(*)
                FROM agent_steps step
                JOIN agent_runs run ON run.id = step.run_id
                WHERE run.owner_id = ?
                  AND run.id = ?
                """,
                Long.class,
                ownerId,
                runId);
        return count == null ? 0 : count;
    }

    @Override
    public void markApprovalApproved(UUID approvalId, UUID decidedBy, Instant now) {
        updateApproval(approvalId, decidedBy, "approved", now);
    }

    @Override
    public void markApprovalRejected(UUID approvalId, UUID decidedBy, Instant now) {
        updateApproval(approvalId, decidedBy, "rejected", now);
    }

    @Override
    public void updateRunStatus(UUID runId, String status, JsonNode result, String failureReason, Instant now) {
        jdbcTemplate.update(
                """
                UPDATE agent_runs
                SET status = ?,
                    result = ?::jsonb,
                    failure_reason = ?,
                    updated_at = ?,
                    completed_at = CASE
                        WHEN ? IN ('succeeded', 'failed', 'rejected') THEN ?::timestamptz
                        ELSE completed_at
                    END
                WHERE id = ?
                """,
                status,
                result == null ? null : toJson(result),
                failureReason,
                Timestamp.from(now),
                status,
                Timestamp.from(now),
                runId);
    }

    @Override
    public UUID saveStep(NewAgentStep step, Instant now) {
        UUID stepId = UUID.randomUUID();
        jdbcTemplate.update(
                """
                INSERT INTO agent_steps (
                    id, run_id, step_order, tool_name, status,
                    input_summary, output_summary, error, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?)
                ON CONFLICT ON CONSTRAINT uq_agent_steps_run_order DO UPDATE
                SET tool_name = EXCLUDED.tool_name,
                    status = EXCLUDED.status,
                    input_summary = EXCLUDED.input_summary,
                    output_summary = EXCLUDED.output_summary,
                    error = EXCLUDED.error,
                    updated_at = EXCLUDED.updated_at
                """,
                stepId,
                step.runId(),
                step.stepOrder(),
                step.toolName(),
                step.status(),
                step.inputSummary(),
                step.outputSummary(),
                step.error() == null ? null : toJson(step.error()),
                Timestamp.from(now),
                Timestamp.from(now));
        return stepId;
    }

    @Override
    public UUID saveApproval(NewAgentApproval approval, Instant now) {
        UUID approvalId = UUID.randomUUID();
        jdbcTemplate.update(
                """
                INSERT INTO agent_approvals (
                    id, run_id, type, description, status, payload, requested_at
                )
                VALUES (?, ?, ?, ?, 'pending', ?::jsonb, ?)
                """,
                approvalId,
                approval.runId(),
                approval.type(),
                approval.description(),
                toJson(safeJson(approval.payload())),
                Timestamp.from(now));
        return approvalId;
    }

    @Override
    public void saveToolCallLog(NewToolCallLog log, Instant now) {
        jdbcTemplate.update(
                """
                INSERT INTO tool_call_logs (
                    id, run_id, step_id, caller_user_id, tool_name,
                    input, output, status, error, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?::jsonb, ?)
                """,
                UUID.randomUUID(),
                log.runId(),
                log.stepId(),
                log.callerUserId(),
                log.toolName(),
                toJson(safeJson(log.input())),
                log.output() == null ? null : toJson(log.output()),
                log.status(),
                log.error() == null ? null : toJson(log.error()),
                Timestamp.from(now));
    }

    private void updateApproval(UUID approvalId, UUID decidedBy, String status, Instant now) {
        jdbcTemplate.update(
                """
                UPDATE agent_approvals
                SET status = ?,
                    decided_by = ?,
                    decided_at = ?
                WHERE id = ?
                  AND status = 'pending'
                """,
                status,
                decidedBy,
                Timestamp.from(now),
                approvalId);
    }

    private RowMapper<AgentRunRecord> runRowMapper() {
        return (rs, rowNum) -> new AgentRunRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("owner_id", UUID.class),
                rs.getString("goal"),
                readStringList(rs, "allowed_tools"),
                rs.getString("status"),
                readJson(rs, "result"),
                rs.getString("failure_reason"),
                rs.getObject("job_id", UUID.class),
                instant(rs, "created_at"),
                instant(rs, "updated_at"),
                instant(rs, "completed_at"));
    }

    private RowMapper<AgentApprovalRecord> approvalRowMapper() {
        return (rs, rowNum) -> new AgentApprovalRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("run_id", UUID.class),
                rs.getString("type"),
                rs.getString("description"),
                rs.getString("status"),
                readJson(rs, "payload"),
                instant(rs, "requested_at"),
                instant(rs, "decided_at"),
                instant(rs, "expires_at"));
    }

    private RowMapper<AgentStepRecord> stepRowMapper() {
        return (rs, rowNum) -> new AgentStepRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("run_id", UUID.class),
                rs.getInt("step_order"),
                rs.getString("tool_name"),
                rs.getString("status"),
                rs.getString("input_summary"),
                rs.getString("output_summary"),
                readJson(rs, "error"),
                instant(rs, "created_at"),
                instant(rs, "updated_at"));
    }

    private List<String> readStringList(ResultSet rs, String column) throws SQLException {
        JsonNode json = readJson(rs, column);
        try {
            return objectMapper.readValue(toJson(json), STRING_LIST);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse agent string list.", exception);
        }
    }

    private JsonNode readJson(ResultSet rs, String column) throws SQLException {
        String value = rs.getString(column);
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse agent JSON column: " + column, exception);
        }
    }

    private JsonNode safeJson(JsonNode json) {
        return json == null ? objectMapper.createObjectNode() : json;
    }

    private String toJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(safeJson(node));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize agent JSON.", exception);
        }
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }
}
