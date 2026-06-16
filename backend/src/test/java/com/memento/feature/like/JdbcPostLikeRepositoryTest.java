package com.memento.feature.like;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.ResultSet;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class JdbcPostLikeRepositoryTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Test
    void likeAccessiblePostInsertsOnceForOwnerOrAcceptedFriendAndReturnsState() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPostLikeRepository repository = new JdbcPostLikeRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<PostLikeState> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(stateResultSet(true, 5), 0));
                });

        Optional<PostLikeState> state = repository.likeAccessiblePost(POST_ID, USER_ID, NOW);

        assertThat(state).contains(new PostLikeState(POST_ID, true, 5));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), any(Object[].class));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("from posts p")
                .contains("p.deleted_at is null")
                .contains("p.author_id = ?")
                .contains("from friendships f")
                .contains("f.status = 'accepted'")
                .contains("insert into post_likes")
                .contains("on conflict (post_id, user_id) do nothing")
                .contains("count(*)::integer");
    }

    @Test
    void likeAccessiblePostReturnsEmptyWhenPostIsNotAccessible() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPostLikeRepository repository = new JdbcPostLikeRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        Optional<PostLikeState> state = repository.likeAccessiblePost(POST_ID, USER_ID, NOW);

        assertThat(state).isEmpty();
    }

    @Test
    void unlikeAccessiblePostDeletesIfPresentAndReturnsStateForAccessiblePost() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPostLikeRepository repository = new JdbcPostLikeRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<PostLikeState> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(stateResultSet(false, 4), 0));
                });

        Optional<PostLikeState> state = repository.unlikeAccessiblePost(POST_ID, USER_ID);

        assertThat(state).contains(new PostLikeState(POST_ID, false, 4));
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), any(Object[].class));
        String sql = sqlCaptor.getValue().toLowerCase();
        assertThat(sql)
                .contains("from posts p")
                .contains("p.deleted_at is null")
                .contains("from friendships f")
                .contains("delete from post_likes")
                .contains("using accessible")
                .contains("pl.user_id = ?")
                .contains("count(*)::integer");
    }

    @Test
    void unlikeAccessiblePostReturnsEmptyWhenPostIsNotAccessible() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPostLikeRepository repository = new JdbcPostLikeRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
                .thenReturn(List.of());

        Optional<PostLikeState> state = repository.unlikeAccessiblePost(POST_ID, USER_ID);

        assertThat(state).isEmpty();
    }

    private ResultSet stateResultSet(boolean likedByMe, int likeCount) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("post_id", UUID.class)).thenReturn(POST_ID);
        when(rs.getBoolean("liked_by_me")).thenReturn(likedByMe);
        when(rs.getInt("like_count")).thenReturn(likeCount);
        return rs;
    }
}
