package com.memento.feature.comment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcCommentRepositoryTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID COMMENT_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Test
    void saveOnOwnedPostInsertsCommentOnlyForOwnedPostAndReturnsMappedRecord() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcCommentRepository repository = new JdbcCommentRepository(jdbcTemplate);
        NewComment comment = new NewComment(
                COMMENT_ID,
                POST_ID,
                USER_ID,
                "좋은 기록이네요.",
                NOW);

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<CommentRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(commentResultSet(), 0));
                });

        Optional<CommentRecord> saved = repository.saveOnOwnedPost(comment);

        assertThat(saved).contains(new CommentRecord(
                COMMENT_ID,
                POST_ID,
                USER_ID,
                "cutan",
                "좋은 기록이네요.",
                NOW,
                NOW));
        verify(jdbcTemplate).query(anyString(), any(RowMapper.class), any(Object[].class));
    }

    @Test
    void existsActivePostOwnedByChecksActivePostAndCurrentOwner() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcCommentRepository repository = new JdbcCommentRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), any(Class.class), any(Object[].class)))
                .thenReturn(true);

        boolean exists = repository.existsActivePostOwnedBy(POST_ID, USER_ID);

        assertThat(exists).isTrue();
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), any(Class.class), any(Object[].class));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("from posts")
                .contains("author_id = ?")
                .contains("deleted_at is null");
    }

    @Test
    void findPageByOwnedPostReturnsActiveCommentsOrderedByCreatedAt() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcCommentRepository repository = new JdbcCommentRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<CommentRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(commentResultSet(), 0));
                });

        List<CommentRecord> comments = repository.findPageByOwnedPost(POST_ID, USER_ID, 20, 0);

        assertThat(comments).containsExactly(new CommentRecord(
                COMMENT_ID,
                POST_ID,
                USER_ID,
                "cutan",
                "좋은 기록이네요.",
                NOW,
                NOW));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), any(Object[].class));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("join posts p")
                .contains("p.author_id = ?")
                .contains("c.deleted_at is null")
                .contains("order by c.created_at asc")
                .contains("limit ?")
                .contains("offset ?");
    }

    @Test
    void countByOwnedPostCountsActiveCommentsOnlyForCurrentOwnersActivePost() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcCommentRepository repository = new JdbcCommentRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), any(Class.class), any(Object[].class)))
                .thenReturn(2L);

        long count = repository.countByOwnedPost(POST_ID, USER_ID);

        assertThat(count).isEqualTo(2L);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), any(Class.class), any(Object[].class));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("count(*)")
                .contains("join posts p")
                .contains("p.author_id = ?")
                .contains("c.deleted_at is null")
                .contains("p.deleted_at is null");
    }

    @Test
    void updateByAuthorUpdatesActiveCommentOnlyForCurrentAuthorAndActivePost() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcCommentRepository repository = new JdbcCommentRepository(jdbcTemplate);

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<CommentRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(updatedCommentResultSet(), 0));
                });

        Optional<CommentRecord> updated = repository.updateByAuthor(
                COMMENT_ID,
                USER_ID,
                "Updated comment",
                NOW);

        assertThat(updated).contains(new CommentRecord(
                COMMENT_ID,
                POST_ID,
                USER_ID,
                "cutan",
                "Updated comment",
                NOW,
                NOW));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), any(Object[].class));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("update comments")
                .contains("c.author_id = ?")
                .contains("c.deleted_at is null")
                .contains("p.deleted_at is null");
    }

    @Test
    void softDeleteByAuthorSoftDeletesActiveCommentOnlyForCurrentAuthorAndActivePost() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcCommentRepository repository = new JdbcCommentRepository(jdbcTemplate);
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        boolean deleted = repository.softDeleteByAuthor(COMMENT_ID, USER_ID, NOW);

        assertThat(deleted).isTrue();
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(sqlCaptor.capture(), any(Object[].class));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("update comments")
                .contains("c.author_id = ?")
                .contains("c.deleted_at is null")
                .contains("p.deleted_at is null");
    }

    @Test
    void softDeleteByAuthorReturnsFalseWhenNoCommentIsVisibleToCurrentAuthor() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcCommentRepository repository = new JdbcCommentRepository(jdbcTemplate);
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(0);

        boolean deleted = repository.softDeleteByAuthor(COMMENT_ID, USER_ID, NOW);

        assertThat(deleted).isFalse();
    }

    private ResultSet commentResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("id", UUID.class)).thenReturn(COMMENT_ID);
        when(rs.getObject("post_id", UUID.class)).thenReturn(POST_ID);
        when(rs.getObject("author_id", UUID.class)).thenReturn(USER_ID);
        when(rs.getString("author_nickname")).thenReturn("cutan");
        when(rs.getString("content")).thenReturn("좋은 기록이네요.");
        when(rs.getTimestamp("created_at")).thenReturn(Timestamp.from(NOW));
        when(rs.getTimestamp("updated_at")).thenReturn(Timestamp.from(NOW));
        return rs;
    }

    private ResultSet updatedCommentResultSet() throws Exception {
        ResultSet rs = commentResultSet();
        when(rs.getString("content")).thenReturn("Updated comment");
        return rs;
    }
}
