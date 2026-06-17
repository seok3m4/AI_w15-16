package com.memento.feature.capsule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcContextCapsuleRepositoryTest {

    private static final UUID OWNER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CAPSULE_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID POST_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID CHUNK_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final Instant NOW = Instant.parse("2026-06-17T00:00:00Z");

    @Test
    void findPageByOwnerReturnsOnlyActiveCapsulesForCurrentUser() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcContextCapsuleRepository repository =
                new JdbcContextCapsuleRepository(jdbcTemplate, new ObjectMapper());
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(OWNER_ID), eq(20), eq(0)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<ContextCapsuleRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(capsuleResultSet(), 0));
                });

        List<ContextCapsuleRecord> records = repository.findPageByOwner(OWNER_ID, 20, 0);

        assertThat(records).hasSize(1);
        assertThat(records.getFirst().id()).isEqualTo(CAPSULE_ID);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq(OWNER_ID), eq(20), eq(0));
        assertThat(sqlCaptor.getValue())
                .contains("WHERE owner_id = ?")
                .contains("AND deleted_at IS NULL")
                .contains("ORDER BY created_at DESC, id DESC")
                .contains("LIMIT ?")
                .contains("OFFSET ?");
    }

    @Test
    void countByOwnerCountsOnlyActiveCapsulesForCurrentUser() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcContextCapsuleRepository repository =
                new JdbcContextCapsuleRepository(jdbcTemplate, new ObjectMapper());
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), eq(OWNER_ID))).thenReturn(3L);

        long count = repository.countByOwner(OWNER_ID);

        assertThat(count).isEqualTo(3);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), eq(Long.class), eq(OWNER_ID));
        assertThat(sqlCaptor.getValue())
                .contains("WHERE owner_id = ?")
                .contains("AND deleted_at IS NULL");
    }

    @Test
    void findActiveByOwnerLoadsCapsuleAndSourcesAfterOwnerScopedLookup() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcContextCapsuleRepository repository =
                new JdbcContextCapsuleRepository(jdbcTemplate, new ObjectMapper());
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class), eq(OWNER_ID), eq(CAPSULE_ID)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<ContextCapsuleRecord> mapper = invocation.getArgument(1);
                    return mapper.mapRow(capsuleResultSet(), 0);
                });
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(CAPSULE_ID)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<ContextCapsuleSourceRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(sourceResultSet(), 0));
                });

        Optional<ContextCapsuleRecord> record = repository.findActiveByOwner(OWNER_ID, CAPSULE_ID);

        assertThat(record).isPresent();
        assertThat(record.get().sources()).containsExactly(new ContextCapsuleSourceRecord(
                POST_ID,
                CHUNK_ID,
                OWNER_ID,
                "cutan",
                "source title",
                "source snippet",
                "post",
                NOW));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), any(RowMapper.class), eq(OWNER_ID), eq(CAPSULE_ID));
        assertThat(sqlCaptor.getValue())
                .contains("WHERE owner_id = ?")
                .contains("AND id = ?")
                .contains("AND deleted_at IS NULL");
    }

    @Test
    void updateByOwnerUpdatesOnlyCurrentUsersActiveCapsule() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcContextCapsuleRepository repository =
                new JdbcContextCapsuleRepository(jdbcTemplate, new ObjectMapper());
        when(jdbcTemplate.update(anyString(), eq("title"), eq("purpose"), any(Timestamp.class), eq(CAPSULE_ID), eq(OWNER_ID)))
                .thenReturn(1);

        boolean updated = repository.updateByOwner(CAPSULE_ID, OWNER_ID, "title", "purpose", NOW);

        assertThat(updated).isTrue();
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(
                sqlCaptor.capture(),
                eq("title"),
                eq("purpose"),
                any(Timestamp.class),
                eq(CAPSULE_ID),
                eq(OWNER_ID));
        assertThat(sqlCaptor.getValue())
                .contains("WHERE id = ?")
                .contains("AND owner_id = ?")
                .contains("AND deleted_at IS NULL");
    }

    @Test
    void softDeleteByOwnerSoftDeletesOnlyCurrentUsersActiveCapsule() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcContextCapsuleRepository repository =
                new JdbcContextCapsuleRepository(jdbcTemplate, new ObjectMapper());
        when(jdbcTemplate.update(anyString(), any(Timestamp.class), any(Timestamp.class), eq(CAPSULE_ID), eq(OWNER_ID)))
                .thenReturn(1);

        boolean deleted = repository.softDeleteByOwner(OWNER_ID, CAPSULE_ID, NOW);

        assertThat(deleted).isTrue();
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(
                sqlCaptor.capture(),
                any(Timestamp.class),
                any(Timestamp.class),
                eq(CAPSULE_ID),
                eq(OWNER_ID));
        assertThat(sqlCaptor.getValue())
                .contains("SET deleted_at = ?")
                .contains("updated_at = ?")
                .contains("WHERE id = ?")
                .contains("AND owner_id = ?")
                .contains("AND deleted_at IS NULL");
    }

    private ResultSet capsuleResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("id", UUID.class)).thenReturn(CAPSULE_ID);
        when(rs.getObject("owner_id", UUID.class)).thenReturn(OWNER_ID);
        when(rs.getString("title")).thenReturn("Project handoff");
        when(rs.getString("purpose")).thenReturn("external llm handoff");
        when(rs.getString("query")).thenReturn("project");
        when(rs.getString("summary")).thenReturn("summary");
        when(rs.getString("key_facts")).thenReturn("[\"fact\"]");
        when(rs.getString("tags")).thenReturn("[\"tag\"]");
        when(rs.getBoolean("contains_friend_context")).thenReturn(false);
        when(rs.getTimestamp("created_at")).thenReturn(Timestamp.from(NOW));
        when(rs.getTimestamp("updated_at")).thenReturn(Timestamp.from(NOW));
        return rs;
    }

    private ResultSet sourceResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("post_id", UUID.class)).thenReturn(POST_ID);
        when(rs.getObject("chunk_id", UUID.class)).thenReturn(CHUNK_ID);
        when(rs.getObject("owner_user_id", UUID.class)).thenReturn(OWNER_ID);
        when(rs.getString("owner_nickname")).thenReturn("cutan");
        when(rs.getString("title")).thenReturn("source title");
        when(rs.getString("snippet")).thenReturn("source snippet");
        when(rs.getString("source_type")).thenReturn("post");
        when(rs.getTimestamp("created_at")).thenReturn(Timestamp.from(NOW));
        return rs;
    }
}
