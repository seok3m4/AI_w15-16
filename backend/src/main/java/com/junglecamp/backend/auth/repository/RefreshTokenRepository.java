package com.junglecamp.backend.auth.repository;

import com.junglecamp.backend.auth.support.TokenHashing;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RefreshTokenRepository {

	private final JdbcTemplate jdbcTemplate;

	public RefreshTokenRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public void save(Long userId, String rawToken, Instant expiresAt) {
		jdbcTemplate.update("""
				INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at)
				VALUES (?, ?, ?)
				""",
				userId,
				TokenHashing.sha256(rawToken),
				Timestamp.from(expiresAt));
	}

	public Optional<RefreshToken> findActive(String rawToken) {
		List<RefreshToken> tokens = jdbcTemplate.query("""
				SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
				FROM auth_refresh_tokens
				WHERE token_hash = ?
				  AND revoked_at IS NULL
				  AND expires_at > CURRENT_TIMESTAMP
				""", this::mapToken, TokenHashing.sha256(rawToken));
		return tokens.stream().findFirst();
	}

	public void revoke(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			return;
		}
		jdbcTemplate.update("""
				UPDATE auth_refresh_tokens
				SET revoked_at = CURRENT_TIMESTAMP
				WHERE token_hash = ? AND revoked_at IS NULL
				""", TokenHashing.sha256(rawToken));
	}

	public void revokeAllForUser(Long userId) {
		jdbcTemplate.update("""
				UPDATE auth_refresh_tokens
				SET revoked_at = CURRENT_TIMESTAMP
				WHERE user_id = ? AND revoked_at IS NULL
				""", userId);
	}

	private RefreshToken mapToken(ResultSet resultSet, int rowNumber) throws SQLException {
		Timestamp revokedAt = resultSet.getTimestamp("revoked_at");
		return new RefreshToken(
				resultSet.getLong("id"),
				resultSet.getLong("user_id"),
				resultSet.getString("token_hash"),
				resultSet.getTimestamp("expires_at").toInstant(),
				revokedAt == null ? null : revokedAt.toInstant(),
				resultSet.getTimestamp("created_at").toInstant());
	}

	public record RefreshToken(
			Long id,
			Long userId,
			String tokenHash,
			Instant expiresAt,
			Instant revokedAt,
			Instant createdAt) {
	}
}
