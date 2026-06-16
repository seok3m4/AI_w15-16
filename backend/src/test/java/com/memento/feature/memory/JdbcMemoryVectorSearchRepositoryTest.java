package com.memento.feature.memory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcMemoryVectorSearchRepositoryTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID CHUNK_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant CREATED_AT = Instant.parse("2026-06-16T09:30:00Z");

    @Test
    void searchMeRestrictsCandidatesToCurrentOwnersActiveSucceededEmbeddings() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMemoryVectorSearchRepository repository = new JdbcMemoryVectorSearchRepository(jdbcTemplate);
        when(jdbcTemplate.query(
                        anyString(),
                        any(RowMapper.class),
                        eq("[0.1,0.2]"),
                        eq(OWNER_ID),
                        eq("mock"),
                        eq("text-embedding-3-small"),
                        eq(1536),
                        eq(5)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<MemoryVectorSearchCandidate> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(resultSet(), 0));
                });

        List<MemoryVectorSearchCandidate> candidates = repository.searchMe(
                OWNER_ID,
                List.of(0.1d, 0.2d),
                "mock",
                "text-embedding-3-small",
                1536,
                5);

        assertThat(candidates).containsExactly(new MemoryVectorSearchCandidate(
                POST_ID,
                CHUNK_ID,
                OWNER_ID,
                "Retrospective",
                "JWT Bearer decision",
                MemorySourceKind.POST_CONTENT,
                0.82d,
                CREATED_AT));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(
                sqlCaptor.capture(),
                any(RowMapper.class),
                eq("[0.1,0.2]"),
                eq(OWNER_ID),
                eq("mock"),
                eq("text-embedding-3-small"),
                eq(1536),
                eq(5));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("from memory_embeddings e")
                .contains("join memory_chunks c on c.id = e.chunk_id")
                .contains("join posts p on p.id = c.post_id")
                .contains("c.owner_id = ?")
                .contains("c.status = 'active'")
                .contains("p.deleted_at is null")
                .contains("e.status = 'succeeded'")
                .contains("e.provider = ?")
                .contains("e.model = ?")
                .contains("e.dimension = ?")
                .contains("e.embedding <=> ?::vector")
                .contains("order by score asc");
    }

    private ResultSet resultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("post_id", UUID.class)).thenReturn(POST_ID);
        when(rs.getObject("chunk_id", UUID.class)).thenReturn(CHUNK_ID);
        when(rs.getObject("owner_id", UUID.class)).thenReturn(OWNER_ID);
        when(rs.getString("title")).thenReturn("Retrospective");
        when(rs.getString("snippet")).thenReturn("JWT Bearer decision");
        when(rs.getString("source_kind")).thenReturn("post_content");
        when(rs.getDouble("score")).thenReturn(0.82d);
        when(rs.getTimestamp("created_at")).thenReturn(Timestamp.from(CREATED_AT));
        return rs;
    }
}
