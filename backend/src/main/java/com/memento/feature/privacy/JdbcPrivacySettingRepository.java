package com.memento.feature.privacy;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcPrivacySettingRepository implements PrivacySettingRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcPrivacySettingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Optional<AiSharingSettingRecord> updateAiSharing(UUID userId, boolean enabled, Instant updatedAt) {
        List<AiSharingSettingRecord> records = jdbcTemplate.query(
                """
                INSERT INTO user_privacy_settings (user_id, friend_ai_sharing_enabled, updated_at)
                SELECT ?, ?, ?
                WHERE EXISTS (
                    SELECT 1
                    FROM users
                    WHERE id = ?
                      AND status = 'active'
                )
                ON CONFLICT (user_id) DO UPDATE
                SET friend_ai_sharing_enabled = EXCLUDED.friend_ai_sharing_enabled,
                    updated_at = EXCLUDED.updated_at
                RETURNING friend_ai_sharing_enabled, updated_at
                """,
                (rs, rowNum) -> new AiSharingSettingRecord(
                        rs.getBoolean("friend_ai_sharing_enabled"),
                        rs.getTimestamp("updated_at").toInstant()),
                userId,
                enabled,
                Timestamp.from(updatedAt),
                userId);
        return records.stream().findFirst();
    }

    @Override
    public boolean isFriendAiSharingEnabled(UUID userId) {
        try {
            Boolean enabled = jdbcTemplate.queryForObject(
                    """
                    SELECT ups.friend_ai_sharing_enabled
                    FROM users u
                    JOIN user_privacy_settings ups ON ups.user_id = u.id
                    WHERE u.id = ?
                      AND u.status = 'active'
                    """,
                    Boolean.class,
                    userId);
            return Boolean.TRUE.equals(enabled);
        } catch (EmptyResultDataAccessException exception) {
            return false;
        }
    }
}
