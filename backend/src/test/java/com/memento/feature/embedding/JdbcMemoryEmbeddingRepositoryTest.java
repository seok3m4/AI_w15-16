package com.memento.feature.embedding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.ResultSet;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@SuppressWarnings({"unchecked", "rawtypes"})
class JdbcMemoryEmbeddingRepositoryTest {

    private static final UUID JOB_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CHUNK_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    void markRunningByJobOnlyTransitionsPendingOrFailedRowsForJob() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMemoryEmbeddingRepository repository = new JdbcMemoryEmbeddingRepository(jdbcTemplate);

        repository.markRunningByJob(JOB_ID);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(sqlCaptor.capture(), eq(JOB_ID));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("update memory_embeddings")
                .contains("set status = 'running'")
                .contains("embedding = null")
                .contains("failure_reason = null")
                .contains("where job_id = ?")
                .contains("status in ('pending', 'failed')");
    }

    @Test
    void findInputsByJobLoadsActiveChunkTextForEmbeddingRequest() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMemoryEmbeddingRepository repository = new JdbcMemoryEmbeddingRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(JOB_ID)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<EmbeddingInputChunk> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(chunkResultSet(), 0));
                });

        List<EmbeddingInputChunk> inputs = repository.findInputsByJob(JOB_ID);

        assertThat(inputs).containsExactly(new EmbeddingInputChunk(CHUNK_ID, "Memory chunk text"));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq(JOB_ID));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("join memory_chunks")
                .contains("where e.job_id = ?")
                .contains("c.status = 'active'");
    }

    @Test
    void saveSucceededStoresPgvectorAndSucceededStatusByJobAndChunk() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMemoryEmbeddingRepository repository = new JdbcMemoryEmbeddingRepository(jdbcTemplate);

        repository.saveSucceeded(JOB_ID, new EmbeddingResponse(
                "mock",
                "text-embedding-3-small",
                1536,
                List.of(new EmbeddingVectorResponse(
                        CHUNK_ID,
                        List.of(0.1d, 0.2d),
                        new EmbeddingUsageResponse(3, 3)))));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<List<Object[]>> argsCaptor = ArgumentCaptor.forClass(List.class);
        verify(jdbcTemplate).batchUpdate(sqlCaptor.capture(), argsCaptor.capture());
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("embedding = ?::vector")
                .contains("status = 'succeeded'")
                .contains("where job_id = ?")
                .contains("and chunk_id = ?");
        assertThat(argsCaptor.getValue().getFirst())
                .containsExactly("mock", "text-embedding-3-small", 1536, "[0.1,0.2]", JOB_ID, CHUNK_ID);
    }

    @Test
    void markFailedByJobClearsVectorAndStoresSanitizedReason() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMemoryEmbeddingRepository repository = new JdbcMemoryEmbeddingRepository(jdbcTemplate);

        repository.markFailedByJob(JOB_ID, "Embedding provider request failed.");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(
                sqlCaptor.capture(),
                eq("Embedding provider request failed."),
                eq(JOB_ID));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("set status = 'failed'")
                .contains("embedding = null")
                .contains("failure_reason = ?")
                .contains("where job_id = ?")
                .contains("status <> 'succeeded'");
    }

    private ResultSet chunkResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("id", UUID.class)).thenReturn(CHUNK_ID);
        when(rs.getString("content")).thenReturn("Memory chunk text");
        return rs;
    }
}
