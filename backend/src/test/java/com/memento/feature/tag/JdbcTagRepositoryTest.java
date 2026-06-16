package com.memento.feature.tag;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcTagRepositoryTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER_USER_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID TAG_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Test
    void findPageByOwnerCountsOnlyActivePostsForCurrentUserTags() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcTagRepository repository = new JdbcTagRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(USER_ID), eq(50), eq(0)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<TagRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(tagResultSet(), 0));
                });

        List<TagRecord> tags = repository.findPageByOwner(USER_ID, 50, 0);

        assertThat(tags).containsExactly(new TagRecord(TAG_ID, "retrospective", 2));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq(USER_ID), eq(50), eq(0));
        assertThat(sqlCaptor.getValue())
                .contains("t.owner_id = ?")
                .contains("p.author_id = t.owner_id")
                .contains("p.deleted_at IS NULL")
                .contains("ORDER BY t.name ASC, t.id ASC");
    }

    @Test
    void countByOwnerScopesToCurrentUser() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcTagRepository repository = new JdbcTagRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), eq(USER_ID))).thenReturn(3L);

        long count = repository.countByOwner(USER_ID);

        assertThat(count).isEqualTo(3);
        verify(jdbcTemplate).queryForObject(anyString(), eq(Long.class), eq(USER_ID));
    }

    private ResultSet tagResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("id", UUID.class)).thenReturn(TAG_ID);
        when(rs.getObject("owner_id", UUID.class)).thenReturn(OTHER_USER_ID);
        when(rs.getString("name")).thenReturn("retrospective");
        when(rs.getInt("post_count")).thenReturn(2);
        return rs;
    }
}
