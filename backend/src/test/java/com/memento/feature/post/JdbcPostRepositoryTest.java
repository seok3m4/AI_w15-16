package com.memento.feature.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcPostRepositoryTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID RETROSPECTIVE_TAG_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID PROJECT_TAG_ID =
            UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Test
    void saveUpsertsUserTagsAndLinksThemToPost() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPostRepository repository = new JdbcPostRepository(jdbcTemplate);
        NewPost post = new NewPost(
                POST_ID,
                USER_ID,
                "오늘의 회고",
                "태그 저장을 확인한다.",
                "pending",
                NOW);

        when(jdbcTemplate.queryForObject(anyString(), eq(UUID.class), eq(USER_ID), eq("회고")))
                .thenReturn(RETROSPECTIVE_TAG_ID);
        when(jdbcTemplate.queryForObject(anyString(), eq(UUID.class), eq(USER_ID), eq("프로젝트")))
                .thenReturn(PROJECT_TAG_ID);
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<PostRecord> mapper = invocation.getArgument(1);
                    return mapper.mapRow(postResultSet(), 0);
                });

        PostRecord saved = repository.save(post, List.of("회고", "프로젝트"));

        assertThat(saved.tags()).containsExactly("회고", "프로젝트");
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate, atLeastOnce()).update(sqlCaptor.capture(), any(Object[].class));
        assertThat(sqlCaptor.getAllValues())
                .anyMatch(sql -> sql.toLowerCase().contains("insert into tags"))
                .anyMatch(sql -> sql.toLowerCase().contains("insert into post_tags"));
    }

    @Test
    void findPageByAuthorUsesStableLatestPagingInsideAuthorScope() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPostRepository repository = new JdbcPostRepository(jdbcTemplate);

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        List<PostRecord> records = repository.findPageByAuthor(USER_ID, null, null, 10, 20);

        assertThat(records).isEmpty();
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), any(Object[].class));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("where p.author_id = ?")
                .contains("and p.deleted_at is null")
                .contains("order by p.created_at desc, p.id desc")
                .contains("limit ?")
                .contains("offset ?");
    }

    @Test
    void findPageByAuthorSearchesTitleContentActiveCommentsAndTagsInsideAuthorScope() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPostRepository repository = new JdbcPostRepository(jdbcTemplate);

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        List<PostRecord> records = repository.findPageByAuthor(USER_ID, "memo", "project", 10, 0);

        assertThat(records).isEmpty();
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), any(Object[].class));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("?::varchar is null")
                .contains("p.title ilike")
                .contains("p.content ilike")
                .contains("from comments c_search")
                .contains("c_search.deleted_at is null")
                .contains("from post_tags pt_search")
                .contains("t_search.name ilike")
                .contains("?::varchar is null")
                .contains("t_filter.normalized_name = ?::varchar");
    }

    private ResultSet postResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        Array tags = mock(Array.class);
        when(tags.getArray()).thenReturn(new String[] {"회고", "프로젝트"});
        when(rs.getObject("id", UUID.class)).thenReturn(POST_ID);
        when(rs.getObject("author_id", UUID.class)).thenReturn(USER_ID);
        when(rs.getString("author_nickname")).thenReturn("cutan");
        when(rs.getString("title")).thenReturn("오늘의 회고");
        when(rs.getString("content")).thenReturn("태그 저장을 확인한다.");
        when(rs.getArray("tags")).thenReturn(tags);
        when(rs.getInt("comment_count")).thenReturn(0);
        when(rs.getInt("like_count")).thenReturn(0);
        when(rs.getBoolean("liked_by_me")).thenReturn(false);
        when(rs.getString("access_scope")).thenReturn("me");
        when(rs.getString("memory_status")).thenReturn("pending");
        when(rs.getTimestamp("created_at")).thenReturn(Timestamp.from(NOW));
        when(rs.getTimestamp("updated_at")).thenReturn(Timestamp.from(NOW));
        return rs;
    }
}
