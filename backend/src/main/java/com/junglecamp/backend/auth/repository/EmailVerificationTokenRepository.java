package com.junglecamp.backend.auth.repository;

import com.junglecamp.backend.auth.support.TokenHashing;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class EmailVerificationTokenRepository {

	private static final int MAX_CODE_ATTEMPTS = 5;

	private final JdbcTemplate jdbcTemplate;
	private final SecureRandom secureRandom = new SecureRandom();

	public EmailVerificationTokenRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public CreatedVerificationToken create(Long userId, Instant expiresAt) {
		String rawToken = randomToken();
		String rawCode = randomCode();
		jdbcTemplate.update("""
				INSERT INTO email_verification_tokens (
					user_id, token_hash, code_hash, code_attempt_count, expires_at
				)
				VALUES (?, ?, ?, 0, ?)
				""",
				userId,
				TokenHashing.sha256(rawToken),
				TokenHashing.sha256(rawCode),
				java.sql.Timestamp.from(expiresAt));
		return new CreatedVerificationToken(rawToken, rawCode);
	}

	public Optional<EmailVerificationToken> findActive(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			return Optional.empty();
		}
		List<EmailVerificationToken> tokens = jdbcTemplate.query("""
				SELECT id, user_id, expires_at, consumed_at, created_at, code_attempt_count
				FROM email_verification_tokens
				WHERE token_hash = ?
				""", this::mapToken, TokenHashing.sha256(rawToken));
		return tokens.stream()
				.filter(this::isActive)
				.findFirst();
	}

	public Optional<EmailVerificationToken> findActiveByUserAndCode(Long userId, String rawCode) {
		if (userId == null || rawCode == null || !rawCode.matches("\\d{6}")) {
			return Optional.empty();
		}
		List<EmailVerificationToken> tokens = jdbcTemplate.query("""
				SELECT id, user_id, expires_at, consumed_at, created_at, code_attempt_count
				FROM email_verification_tokens
				WHERE user_id = ? AND code_hash = ?
				ORDER BY created_at DESC, id DESC
				""", this::mapToken, userId, TokenHashing.sha256(rawCode));
		return tokens.stream()
				.filter(this::isActive)
				.filter(token -> token.codeAttemptCount() < MAX_CODE_ATTEMPTS)
				.findFirst();
	}

	public boolean latestActiveCodeAttemptsExceeded(Long userId) {
		return latestActiveForUser(userId)
				.map(token -> token.codeAttemptCount() >= MAX_CODE_ATTEMPTS)
				.orElse(false);
	}

	public void incrementLatestActiveCodeAttempt(Long userId) {
		jdbcTemplate.update("""
				UPDATE email_verification_tokens
				SET code_attempt_count = code_attempt_count + 1
				WHERE id = (
					SELECT id
					FROM email_verification_tokens
					WHERE user_id = ?
						AND consumed_at IS NULL
						AND expires_at > CURRENT_TIMESTAMP
					ORDER BY created_at DESC, id DESC
					LIMIT 1
				)
				""", userId);
	}

	public void consume(Long id) {
		jdbcTemplate.update("""
				UPDATE email_verification_tokens
				SET consumed_at = CURRENT_TIMESTAMP
				WHERE id = ? AND consumed_at IS NULL
				""", id);
	}

	public void consumeActiveForUser(Long userId) {
		jdbcTemplate.update("""
				UPDATE email_verification_tokens
				SET consumed_at = CURRENT_TIMESTAMP
				WHERE user_id = ?
					AND consumed_at IS NULL
					AND expires_at > CURRENT_TIMESTAMP
				""", userId);
	}

	private Optional<EmailVerificationToken> latestActiveForUser(Long userId) {
		if (userId == null) {
			return Optional.empty();
		}
		List<EmailVerificationToken> tokens = jdbcTemplate.query("""
				SELECT id, user_id, expires_at, consumed_at, created_at, code_attempt_count
				FROM email_verification_tokens
				WHERE user_id = ?
				ORDER BY created_at DESC, id DESC
				LIMIT 1
				""", this::mapToken, userId);
		return tokens.stream()
				.filter(this::isActive)
				.findFirst();
	}

	private boolean isActive(EmailVerificationToken token) {
		return token.consumedAt() == null && Instant.now().isBefore(token.expiresAt());
	}

	private EmailVerificationToken mapToken(ResultSet resultSet, int rowNumber) throws SQLException {
		return new EmailVerificationToken(
				resultSet.getLong("id"),
				resultSet.getLong("user_id"),
				resultSet.getTimestamp("expires_at").toInstant(),
				resultSet.getTimestamp("consumed_at") == null ? null : resultSet.getTimestamp("consumed_at").toInstant(),
				resultSet.getTimestamp("created_at").toInstant(),
				resultSet.getInt("code_attempt_count"));
	}

	private String randomToken() {
		byte[] bytes = new byte[32];
		secureRandom.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String randomCode() {
		return String.format("%06d", secureRandom.nextInt(1_000_000));
	}

	public record CreatedVerificationToken(String rawToken, String rawCode) {
	}

	public record EmailVerificationToken(
			Long id,
			Long userId,
			Instant expiresAt,
			Instant consumedAt,
			Instant createdAt,
			int codeAttemptCount) {
	}
}
