package com.memento.feature.jobs;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
class JdbcAsyncJobRepository implements AsyncJobRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    JdbcAsyncJobRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public AsyncJobRecord enqueue(
            UUID ownerId,
            AsyncJobType type,
            JsonNode input,
            boolean retryable,
            int maxAttempts,
            Instant now) {
        UUID jobId = UUID.randomUUID();
        return jdbcTemplate.queryForObject(
                """
                INSERT INTO async_jobs (
                    id, owner_id, type, status, progress, input, retryable,
                    attempt_count, max_attempts, created_at, updated_at
                )
                VALUES (?, ?, ?, 'pending', 0, ?::jsonb, ?, 0, ?, ?, ?)
                RETURNING *
                """,
                jobRowMapper(),
                jobId,
                ownerId,
                type.value(),
                toJson(input),
                retryable,
                maxAttempts,
                Timestamp.from(now),
                Timestamp.from(now));
    }

    @Override
    public Optional<AsyncJobRecord> findById(UUID jobId) {
        return jdbcTemplate.query(
                        "SELECT * FROM async_jobs WHERE id = ?",
                        jobRowMapper(),
                        jobId)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<AsyncJobRecord> findForOwner(UUID ownerId, UUID jobId) {
        return jdbcTemplate.query(
                        "SELECT * FROM async_jobs WHERE owner_id = ? AND id = ?",
                        jobRowMapper(),
                        ownerId,
                        jobId)
                .stream()
                .findFirst();
    }

    @Override
    public Optional<ClaimedAsyncJob> claimNext(Collection<AsyncJobType> supportedTypes, Instant now) {
        if (supportedTypes.isEmpty()) {
            return Optional.empty();
        }
        List<String> typeValues = supportedTypes.stream()
                .map(AsyncJobType::value)
                .toList();
        String placeholders = String.join(",", typeValues.stream().map(type -> "?").toList());
        Object[] params = new Object[typeValues.size() + 2];
        for (int i = 0; i < typeValues.size(); i++) {
            params[i] = typeValues.get(i);
        }
        params[typeValues.size()] = Timestamp.from(now);
        params[typeValues.size() + 1] = Timestamp.from(now);

        String sql = """
                WITH candidate AS (
                    SELECT id
                    FROM async_jobs
                    WHERE status = 'pending'
                      AND type IN (%s)
                    ORDER BY created_at
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                UPDATE async_jobs job
                SET status = 'running',
                    progress = 0,
                    started_at = ?,
                    updated_at = ?,
                    attempt_count = attempt_count + 1
                WHERE job.id = (SELECT id FROM candidate)
                RETURNING *
                """.formatted(placeholders);

        return jdbcTemplate.query(sql, claimedJobRowMapper(), params)
                .stream()
                .findFirst();
    }

    @Override
    public void markSucceeded(UUID jobId, JsonNode result, Instant now) {
        jdbcTemplate.update(
                """
                UPDATE async_jobs
                SET status = 'succeeded',
                    progress = 100,
                    result = ?::jsonb,
                    error = NULL,
                    updated_at = ?,
                    completed_at = ?
                WHERE id = ?
                  AND status = 'running'
                """,
                toJson(result),
                Timestamp.from(now),
                Timestamp.from(now),
                jobId);
    }

    @Override
    public void markFailedOrRetry(UUID jobId, AsyncJobError error, Instant now) {
        String errorJson = toJson(objectMapper.valueToTree(error));
        jdbcTemplate.update(
                """
                UPDATE async_jobs
                SET status = CASE
                        WHEN retryable = true
                         AND ? = true
                         AND attempt_count < max_attempts
                        THEN 'pending'
                        ELSE 'failed'
                    END,
                    progress = CASE
                        WHEN retryable = true
                         AND ? = true
                         AND attempt_count < max_attempts
                        THEN 0
                        ELSE progress
                    END,
                    started_at = CASE
                        WHEN retryable = true
                         AND ? = true
                         AND attempt_count < max_attempts
                        THEN NULL
                        ELSE started_at
                    END,
                    completed_at = CASE
                        WHEN retryable = true
                         AND ? = true
                         AND attempt_count < max_attempts
                        THEN NULL
                        ELSE ?
                    END,
                    error = ?::jsonb,
                    updated_at = ?
                WHERE id = ?
                  AND status = 'running'
                """,
                error.retryable(),
                error.retryable(),
                error.retryable(),
                error.retryable(),
                Timestamp.from(now),
                errorJson,
                Timestamp.from(now),
                jobId);
    }

    @Override
    public int recoverTimedOutJobs(Instant staleBefore, Instant now) {
        String errorJson = toJson(objectMapper.valueToTree(AsyncJobError.timeout()));
        return jdbcTemplate.update(
                """
                UPDATE async_jobs
                SET status = CASE
                        WHEN retryable = true
                         AND attempt_count < max_attempts
                        THEN 'pending'
                        ELSE 'failed'
                    END,
                    progress = CASE
                        WHEN retryable = true
                         AND attempt_count < max_attempts
                        THEN 0
                        ELSE progress
                    END,
                    started_at = CASE
                        WHEN retryable = true
                         AND attempt_count < max_attempts
                        THEN NULL
                        ELSE started_at
                    END,
                    completed_at = CASE
                        WHEN retryable = true
                         AND attempt_count < max_attempts
                        THEN NULL
                        ELSE ?
                    END,
                    error = ?::jsonb,
                    updated_at = ?
                WHERE status = 'running'
                  AND COALESCE(updated_at, started_at, created_at) < ?
                """,
                Timestamp.from(now),
                errorJson,
                Timestamp.from(now),
                Timestamp.from(staleBefore));
    }

    private RowMapper<AsyncJobRecord> jobRowMapper() {
        return (rs, rowNum) -> new AsyncJobRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("owner_id", UUID.class),
                AsyncJobType.fromValue(rs.getString("type")),
                AsyncJobStatus.fromValue(rs.getString("status")),
                rs.getInt("progress"),
                readJson(rs, "input"),
                readJson(rs, "result"),
                readJson(rs, "error"),
                rs.getBoolean("retryable"),
                rs.getInt("attempt_count"),
                rs.getInt("max_attempts"),
                instant(rs, "created_at"),
                instant(rs, "updated_at"),
                instant(rs, "started_at"),
                instant(rs, "completed_at"));
    }

    private RowMapper<ClaimedAsyncJob> claimedJobRowMapper() {
        return (rs, rowNum) -> new ClaimedAsyncJob(
                rs.getObject("id", UUID.class),
                rs.getObject("owner_id", UUID.class),
                AsyncJobType.fromValue(rs.getString("type")),
                readJson(rs, "input"),
                rs.getInt("attempt_count"),
                rs.getInt("max_attempts"));
    }

    private JsonNode readJson(ResultSet rs, String column) throws SQLException {
        String value = rs.getString(column);
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse async job JSON column: " + column, exception);
        }
    }

    private String toJson(JsonNode node) {
        try {
            JsonNode safeNode = node == null ? objectMapper.createObjectNode() : node;
            return objectMapper.writeValueAsString(safeNode);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize async job JSON.", exception);
        }
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }
}
