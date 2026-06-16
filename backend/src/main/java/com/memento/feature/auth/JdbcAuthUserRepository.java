package com.memento.feature.auth;

import java.sql.Timestamp;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcAuthUserRepository implements AuthUserRepository {

    private final JdbcTemplate jdbcTemplate;

    JdbcAuthUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public boolean existsActiveByEmailLookupHash(byte[] emailLookupHash) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM users
                    WHERE email_lookup_hash = ?
                      AND status = 'active'
                )
                """,
                Boolean.class,
                emailLookupHash);
        return Boolean.TRUE.equals(exists);
    }

    @Override
    public void insert(AuthUserRecord user) {
        jdbcTemplate.update(
                """
                INSERT INTO users (
                    id,
                    email_ciphertext,
                    email_nonce,
                    email_key_id,
                    email_lookup_hash,
                    password_hash,
                    nickname,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                """,
                user.id(),
                user.emailCiphertext(),
                user.emailNonce(),
                user.emailKeyId(),
                user.emailLookupHash(),
                user.passwordHash(),
                user.nickname(),
                Timestamp.from(user.createdAt()),
                Timestamp.from(user.createdAt()));
    }

    @Override
    public void insertDefaultPrivacySettings(UUID userId) {
        jdbcTemplate.update(
                """
                INSERT INTO user_privacy_settings (user_id, friend_ai_sharing_enabled)
                VALUES (?, false)
                """,
                userId);
    }
}
