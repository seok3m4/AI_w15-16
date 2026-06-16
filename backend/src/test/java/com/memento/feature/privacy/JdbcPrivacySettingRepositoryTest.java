package com.memento.feature.privacy;

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
class JdbcPrivacySettingRepositoryTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Test
    void updateAiSharingUpsertsOnlyForActiveUsersAndReturnsUpdatedSetting() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPrivacySettingRepository repository = new JdbcPrivacySettingRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(USER_ID), eq(true),
                eq(Timestamp.from(NOW)), eq(USER_ID)))
                .thenAnswer(invocation -> {
                    RowMapper<AiSharingSettingRecord> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(settingResultSet(), 0));
                });

        AiSharingSettingRecord record = repository.updateAiSharing(USER_ID, true, NOW).orElseThrow();

        assertThat(record.friendAiSharingEnabled()).isTrue();
        assertThat(record.updatedAt()).isEqualTo(NOW);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(sqlCaptor.capture(), any(RowMapper.class), eq(USER_ID), eq(true),
                eq(Timestamp.from(NOW)), eq(USER_ID));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("insert into user_privacy_settings")
                .contains("where exists")
                .contains("status = 'active'")
                .contains("on conflict (user_id) do update")
                .contains("returning friend_ai_sharing_enabled, updated_at");
    }

    @Test
    void updateAiSharingReturnsEmptyWhenNoActiveUserExists() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPrivacySettingRepository repository = new JdbcPrivacySettingRepository(jdbcTemplate);
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(USER_ID), eq(true),
                eq(Timestamp.from(NOW)), eq(USER_ID)))
                .thenReturn(List.of());

        assertThat(repository.updateAiSharing(USER_ID, true, NOW)).isEmpty();
    }

    @Test
    void isFriendAiSharingEnabledOnlyReturnsTrueForActiveUsersWithConsent() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPrivacySettingRepository repository = new JdbcPrivacySettingRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), eq(USER_ID)))
                .thenReturn(true);

        assertThat(repository.isFriendAiSharingEnabled(USER_ID)).isTrue();
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), eq(Boolean.class), eq(USER_ID));
        assertThat(sqlCaptor.getValue().toLowerCase())
                .contains("join user_privacy_settings")
                .contains("status = 'active'");
    }

    @Test
    void isFriendAiSharingEnabledReturnsFalseForMissingOrInactiveUsers() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        JdbcPrivacySettingRepository repository = new JdbcPrivacySettingRepository(jdbcTemplate);
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), eq(USER_ID)))
                .thenThrow(new EmptyResultDataAccessException(1));

        assertThat(repository.isFriendAiSharingEnabled(USER_ID)).isFalse();
    }

    private ResultSet settingResultSet() throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.getBoolean("friend_ai_sharing_enabled")).thenReturn(true);
        when(resultSet.getTimestamp("updated_at")).thenReturn(Timestamp.from(NOW));
        return resultSet;
    }
}
