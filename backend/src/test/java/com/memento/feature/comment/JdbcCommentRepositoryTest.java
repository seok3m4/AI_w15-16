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
}
