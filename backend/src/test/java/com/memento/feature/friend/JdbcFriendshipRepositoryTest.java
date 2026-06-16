package com.memento.feature.friend;

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
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@SuppressWarnings("unchecked")
class JdbcFriendshipRepositoryTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FRIEND_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID FRIENDSHIP_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Test
    void findActiveUserByIdOnlyReturnsActiveUsers() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class), eq(USER_ID)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<FriendshipUserRecord> mapper = invocation.getArgument(1);
                    return mapper.mapRow(userResultSet(), 0);
                });

        FriendshipUserRecord user = repository.findActiveUserById(USER_ID).orElseThrow();

        assertThat(user.nickname()).isEqualTo("cutan");
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), any(RowMapper.class), eq(USER_ID));
        assertThat(sqlCaptor.getValue().toLowerCase()).contains("status = 'active'");
    }

    @Test
    void findActiveUserByIdReturnsEmptyWhenUserIsMissing() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class), eq(USER_ID)))
                .thenThrow(new EmptyResultDataAccessException(1));

        assertThat(repository.findActiveUserById(USER_ID)).isEmpty();
    }

    @Test
    void existsPendingOrAcceptedBetweenChecksOrderedActivePair() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), eq(USER_ID), eq(FRIEND_ID)))
                .thenReturn(true);

        assertThat(repository.existsPendingOrAcceptedBetween(USER_ID, FRIEND_ID)).isTrue();
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), eq(Boolean.class), eq(USER_ID), eq(FRIEND_ID));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("least_user_id = ?")
                .contains("greatest_user_id = ?")
                .contains("status in ('pending', 'accepted')");
    }

    @Test
    void existsAcceptedBetweenChecksOrderedAcceptedPair() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), eq(USER_ID), eq(FRIEND_ID)))
                .thenReturn(true);

        assertThat(repository.existsAcceptedBetween(USER_ID, FRIEND_ID)).isTrue();
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), eq(Boolean.class), eq(USER_ID), eq(FRIEND_ID));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("least_user_id = ?")
                .contains("greatest_user_id = ?")
                .contains("status = 'accepted'");
    }

    @Test
    void insertPendingStoresRequesterAddresseeOrderedPairAndTimestamps() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        NewFriendship friendship = new NewFriendship(
                FRIENDSHIP_ID,
                USER_ID,
                FRIEND_ID,
                USER_ID,
                FRIEND_ID,
                NOW);

        repository.insertPending(friendship);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(
                sqlCaptor.capture(),
                eq(FRIENDSHIP_ID),
                eq(USER_ID),
                eq(FRIEND_ID),
                eq(USER_ID),
                eq(FRIEND_ID),
                eq(Timestamp.from(NOW)),
                eq(Timestamp.from(NOW)));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("insert into friendships")
                .contains("status")
                .contains("'pending'");
    }

    @Test
    void updatePendingForAddresseeRequiresPendingRequestAndCurrentAddressee() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq("accepted"), eq(Timestamp.from(NOW)),
                eq(Timestamp.from(NOW)), eq(FRIENDSHIP_ID), eq(USER_ID)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<FriendshipStatusRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(statusResultSet(), 0));
                });

        FriendshipStatusRecord updated = repository
                .updatePendingForAddressee(FRIENDSHIP_ID, USER_ID, "accepted", NOW)
                .orElseThrow();

        assertThat(updated.status()).isEqualTo("accepted");
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq("accepted"), eq(Timestamp.from(NOW)),
                eq(Timestamp.from(NOW)), eq(FRIENDSHIP_ID), eq(USER_ID));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("where id = ?")
                .contains("and addressee_id = ?")
                .contains("and status = 'pending'")
                .contains("returning id, status, updated_at");
    }

    @Test
    void findPageByUserAndStatusReturnsCounterpartAndDirection() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(USER_ID), eq(USER_ID), eq(USER_ID), eq(USER_ID),
                eq(USER_ID), eq("accepted"), eq(20), eq(0)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<FriendshipListRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(listResultSet(), 0));
                });

        List<FriendshipListRecord> records =
                repository.findPageByUserAndStatus(USER_ID, "accepted", 20, 0);

        assertThat(records).hasSize(1);
        assertThat(records.get(0).user().id()).isEqualTo(FRIEND_ID);
        assertThat(records.get(0).direction()).isEqualTo("outgoing");
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq(USER_ID), eq(USER_ID), eq(USER_ID),
                eq(USER_ID), eq(USER_ID), eq("accepted"), eq(20), eq(0));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("join users")
                .contains("requester_id = ? or f.addressee_id = ?")
                .contains("and f.status = ?")
                .contains("order by f.updated_at desc, f.requested_at desc");
    }

    @Test
    void countByUserAndStatusUsesCurrentUserAndStatus() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), eq(USER_ID), eq(USER_ID), eq("pending")))
                .thenReturn(2L);

        assertThat(repository.countByUserAndStatus(USER_ID, "pending")).isEqualTo(2);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), eq(Long.class), eq(USER_ID), eq(USER_ID),
                eq("pending"));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("count(*)")
                .contains("requester_id = ? or addressee_id = ?")
                .contains("status = ?");
    }

    @Test
    void cancelPendingForRequesterRequiresRequesterAndPendingStatus() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(Timestamp.from(NOW)),
                eq(FRIENDSHIP_ID), eq(USER_ID)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<FriendshipStatusRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(cancelledStatusResultSet(), 0));
                });

        FriendshipStatusRecord updated = repository
                .cancelPendingForRequester(FRIENDSHIP_ID, USER_ID, NOW)
                .orElseThrow();

        assertThat(updated.status()).isEqualTo("cancelled");
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq(Timestamp.from(NOW)),
                eq(FRIENDSHIP_ID), eq(USER_ID));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("set status = 'cancelled'")
                .contains("where id = ?")
                .contains("and requester_id = ?")
                .contains("and status = 'pending'");
    }

    @Test
    void removeAcceptedForParticipantRequiresEitherPartyAndAcceptedStatus() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcFriendshipRepository repository = new JdbcFriendshipRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(Timestamp.from(NOW)),
                eq(Timestamp.from(NOW)), eq(FRIENDSHIP_ID), eq(USER_ID), eq(USER_ID)))
                .thenAnswer(invocation -> {
                    @SuppressWarnings("unchecked")
                    RowMapper<FriendshipStatusRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(removedStatusResultSet(), 0));
                });

        FriendshipStatusRecord updated = repository
                .removeAcceptedForParticipant(FRIENDSHIP_ID, USER_ID, NOW)
                .orElseThrow();

        assertThat(updated.status()).isEqualTo("removed");
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq(Timestamp.from(NOW)),
                eq(Timestamp.from(NOW)), eq(FRIENDSHIP_ID), eq(USER_ID), eq(USER_ID));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("set status = 'removed'")
                .contains("removed_at = ?")
                .contains("where id = ?")
                .contains("requester_id = ? or addressee_id = ?")
                .contains("and status = 'accepted'");
    }

    private ResultSet userResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("id", UUID.class)).thenReturn(USER_ID);
        when(rs.getString("nickname")).thenReturn("cutan");
        return rs;
    }

    private ResultSet statusResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("id", UUID.class)).thenReturn(FRIENDSHIP_ID);
        when(rs.getString("status")).thenReturn("accepted");
        when(rs.getTimestamp("updated_at")).thenReturn(Timestamp.from(NOW));
        return rs;
    }

    private ResultSet cancelledStatusResultSet() throws Exception {
        ResultSet rs = statusResultSet();
        when(rs.getString("status")).thenReturn("cancelled");
        return rs;
    }

    private ResultSet removedStatusResultSet() throws Exception {
        ResultSet rs = statusResultSet();
        when(rs.getString("status")).thenReturn("removed");
        return rs;
    }

    private ResultSet listResultSet() throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("id", UUID.class)).thenReturn(FRIENDSHIP_ID);
        when(rs.getObject("user_id", UUID.class)).thenReturn(FRIEND_ID);
        when(rs.getString("nickname")).thenReturn("friend");
        when(rs.getString("status")).thenReturn("accepted");
        when(rs.getString("direction")).thenReturn("outgoing");
        when(rs.getTimestamp("requested_at")).thenReturn(Timestamp.from(NOW));
        when(rs.getTimestamp("updated_at")).thenReturn(Timestamp.from(NOW));
        return rs;
    }
}
