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
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcMemoryChunkRepositoryTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID TAG_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID CHUNK_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final Instant NOW = Instant.parse("2026-06-16T09:30:00Z");

    @Test
    void findActivePostSourceLoadsPostAndTagsInsideOwnerScope() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMemoryChunkRepository repository = new JdbcMemoryChunkRepository(jdbcTemplate);

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(POST_ID), eq(OWNER_ID)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<PostMemorySourceRow> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(postSourceResultSet(), 0));
                });

        Optional<PostMemorySource> source = repository.findActivePostSource(POST_ID, OWNER_ID);

        assertThat(source).isPresent();
        assertThat(source.get().tags()).containsExactly(new PostMemoryTagSource(TAG_ID, "project"));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq(POST_ID), eq(OWNER_ID));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("from posts p")
                .contains("left join post_tags pt")
                .contains("left join tags t")
                .contains("where p.id = ?")
                .contains("and p.author_id = ?")
                .contains("and p.deleted_at is null")
                .contains("order by t.name asc");
    }

    @Test
    void saveAllInsertsActiveChunksWithSourceColumns() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMemoryChunkRepository repository = new JdbcMemoryChunkRepository(jdbcTemplate);

        repository.saveAll(List.of(new NewMemoryChunk(
                CHUNK_ID,
                OWNER_ID,
                POST_ID,
                null,
                TAG_ID,
                MemorySourceKind.TAG,
                "project",
                new byte[] {1, 2, 3},
                NOW)));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).batchUpdate(sqlCaptor.capture(), ArgumentMatchers.<List<Object[]>>any());
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("insert into memory_chunks")
                .contains("owner_id")
                .contains("post_id")
                .contains("tag_id")
                .contains("source_kind")
                .contains("content_hash")
                .contains("'active'");
    }

    @Test
    void markActiveChunksStaleOnlyTouchesCurrentOwnersActivePostChunks() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMemoryChunkRepository repository = new JdbcMemoryChunkRepository(jdbcTemplate);

        repository.markActiveChunksStale(POST_ID, OWNER_ID, NOW);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(
                sqlCaptor.capture(),
                eq(Timestamp.from(NOW)),
                eq(POST_ID),
                eq(OWNER_ID));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("update memory_chunks")
                .contains("set status = 'stale'")
                .contains("updated_at = ?")
                .contains("where post_id = ?")
                .contains("and owner_id = ?")
                .contains("and status = 'active'");
    }

    @Test
    void markChunksDeletedExcludesPostChunksAndRecordsDeletedAt() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcMemoryChunkRepository repository = new JdbcMemoryChunkRepository(jdbcTemplate);

        repository.markChunksDeleted(POST_ID, OWNER_ID, NOW);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(
                sqlCaptor.capture(),
                eq(Timestamp.from(NOW)),
                eq(Timestamp.from(NOW)),
                eq(POST_ID),
                eq(OWNER_ID));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("update memory_chunks")
                .contains("set status = 'deleted'")
                .contains("deleted_at = ?")
                .contains("updated_at = ?")
                .contains("where post_id = ?")
                .contains("and owner_id = ?")
                .contains("and status <> 'deleted'");
    }

    private ResultSet postSourceResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("post_id", UUID.class)).thenReturn(POST_ID);
        when(rs.getObject("owner_id", UUID.class)).thenReturn(OWNER_ID);
        when(rs.getString("title")).thenReturn("Jungle project retrospective");
        when(rs.getString("content")).thenReturn("Today I learned how to shape memory chunks.");
        when(rs.getObject("tag_id", UUID.class)).thenReturn(TAG_ID);
        when(rs.getString("tag_name")).thenReturn("project");
        when(rs.getTimestamp("created_at")).thenReturn(Timestamp.from(NOW));
        return rs;
    }
}
