package com.memento.feature.jobs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

class JdbcAsyncJobRepositoryTest {

    private static final UUID JOB_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
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
}
