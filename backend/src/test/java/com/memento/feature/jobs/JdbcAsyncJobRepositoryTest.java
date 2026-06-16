package com.memento.feature.jobs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcAsyncJobRepositoryTest {

    private static final UUID JOB_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-16T09:30:00Z");

    @Test
    void markFailedOrRetryCastsCompletedAtCaseBranchesForPostgres() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcAsyncJobRepository repository = new JdbcAsyncJobRepository(jdbcTemplate, new ObjectMapper());
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        repository.markFailedOrRetry(JOB_ID, AsyncJobError.timeout(), NOW);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(sqlCaptor.capture(), any(Object[].class));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("then null::timestamptz")
                .contains("else ?::timestamptz");
    }

    @Test
    void recoverTimedOutJobsCastsCompletedAtCaseBranchesForPostgres() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcAsyncJobRepository repository = new JdbcAsyncJobRepository(jdbcTemplate, new ObjectMapper());
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        repository.recoverTimedOutJobs(NOW.minusSeconds(60), NOW);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(sqlCaptor.capture(), any(Object[].class));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("then null::timestamptz")
                .contains("else ?::timestamptz");
    }

    @Test
    void findPendingMemoryReindexForPostLocksPendingJobByOwnerAndPostId() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcAsyncJobRepository repository = new JdbcAsyncJobRepository(jdbcTemplate, new ObjectMapper());

        repository.findPendingMemoryReindexForPost(OWNER_ID, POST_ID);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq(OWNER_ID), eq(POST_ID.toString()));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("from async_jobs")
                .contains("owner_id = ?")
                .contains("type = 'memory_reindex'")
                .contains("status = 'pending'")
                .contains("input ->> 'postid' = ?")
                .contains("for update");
    }
}
