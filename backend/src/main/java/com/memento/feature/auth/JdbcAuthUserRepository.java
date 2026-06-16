package com.memento.feature.auth;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcAuthUserRepository implements AuthUserRepository, RefreshTokenSessionRepository {

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
    public Optional<AuthLoginUser> findActiveLoginUserByEmailLookupHash(byte[] emailLookupHash) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                    SELECT
                        u.id,
                        u.password_hash,
                        u.nickname,
                        ups.friend_ai_sharing_enabled,
                        u.created_at
                    FROM users u
                    JOIN user_privacy_settings ups ON ups.user_id = u.id
                    WHERE u.email_lookup_hash = ?
                      AND u.status = 'active'
                    """,
                    (rs, rowNum) -> new AuthLoginUser(
                            rs.getObject("id", UUID.class),
                            rs.getString("password_hash"),
                            rs.getString("nickname"),
                            rs.getBoolean("friend_ai_sharing_enabled"),
                            rs.getTimestamp("created_at").toInstant()),
                    emailLookupHash));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
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

    @Override
    public void insert(RefreshTokenSessionRecord session) {
        jdbcTemplate.update(
                """
                INSERT INTO refresh_token_sessions (
                    id,
                    user_id,
                    session_family_id,
                    token_hash,
                    rotated_from_hash,
                    expires_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                session.id(),
                session.userId(),
                session.sessionFamilyId(),
                session.tokenHash(),
                session.rotatedFromHash(),
                Timestamp.from(session.expiresAt()));
    }

    @Override
    public Optional<RefreshTokenSessionRecord> findByTokenHash(byte[] tokenHash) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject(
                    """
                    SELECT
                        id,
                        user_id,
                        session_family_id,
                        token_hash,
                        rotated_from_hash,
                        expires_at,
                        rotated_at,
                        revoked_at
                    FROM refresh_token_sessions
                    WHERE token_hash = ?
                    """,
                    (rs, rowNum) -> new RefreshTokenSessionRecord(
                            rs.getObject("id", UUID.class),
                            rs.getObject("user_id", UUID.class),
                            rs.getObject("session_family_id", UUID.class),
                            rs.getBytes("token_hash"),
                            rs.getBytes("rotated_from_hash"),
                            rs.getTimestamp("expires_at").toInstant(),
                            toInstant(rs.getTimestamp("rotated_at")),
                            toInstant(rs.getTimestamp("revoked_at"))),
                    tokenHash));
        } catch (EmptyResultDataAccessException exception) {
            return Optional.empty();
        }
    }

    @Override
    public boolean markRotated(UUID sessionId, Instant rotatedAt, Instant lastUsedAt) {
        int updated = jdbcTemplate.update(
                """
                UPDATE refresh_token_sessions
                SET rotated_at = ?,
                    last_used_at = ?
                WHERE id = ?
                  AND rotated_at IS NULL
                  AND revoked_at IS NULL
                  AND expires_at > ?
                """,
                Timestamp.from(rotatedAt),
                Timestamp.from(lastUsedAt),
                sessionId,
                Timestamp.from(rotatedAt));
        return updated == 1;
    }

    @Override
    public void revokeFamily(UUID sessionFamilyId, String revokedReason, Instant revokedAt) {
        jdbcTemplate.update(
                """
                UPDATE refresh_token_sessions
                SET revoked_at = ?,
                    revoked_reason = ?
                WHERE session_family_id = ?
                  AND revoked_at IS NULL
                """,
                Timestamp.from(revokedAt),
                revokedReason,
                sessionFamilyId);
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
