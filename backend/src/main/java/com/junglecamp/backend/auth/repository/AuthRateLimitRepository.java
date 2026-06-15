package com.junglecamp.backend.auth.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuthRateLimitRepository {

	private final JdbcTemplate jdbcTemplate;

	public AuthRateLimitRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public Optional<Bucket> find(String key) {
		List<Bucket> buckets = jdbcTemplate.query("""
				SELECT rate_key, action, attempt_count, window_started_at, blocked_until, captcha_required_until
				FROM auth_rate_limits
				WHERE rate_key = ?
				""", this::mapBucket, key);
		return buckets.stream().findFirst();
	}

	public void save(Bucket bucket) {
		int updated = jdbcTemplate.update("""
				UPDATE auth_rate_limits
				SET attempt_count = ?,
					window_started_at = ?,
					blocked_until = ?,
					captcha_required_until = ?,
					updated_at = CURRENT_TIMESTAMP
				WHERE rate_key = ?
				""",
				bucket.attemptCount(),
				Timestamp.from(bucket.windowStartedAt()),
				timestamp(bucket.blockedUntil()),
				timestamp(bucket.captchaRequiredUntil()),
				bucket.key());
		if (updated == 0) {
			jdbcTemplate.update("""
					INSERT INTO auth_rate_limits (
						rate_key, action, attempt_count, window_started_at, blocked_until, captcha_required_until
					) VALUES (?, ?, ?, ?, ?, ?)
					""",
					bucket.key(),
					bucket.action(),
					bucket.attemptCount(),
					Timestamp.from(bucket.windowStartedAt()),
					timestamp(bucket.blockedUntil()),
					timestamp(bucket.captchaRequiredUntil()));
		}
	}

	public void delete(String key) {
		jdbcTemplate.update("DELETE FROM auth_rate_limits WHERE rate_key = ?", key);
	}

	private Bucket mapBucket(ResultSet resultSet, int rowNumber) throws SQLException {
		return new Bucket(
				resultSet.getString("rate_key"),
				resultSet.getString("action"),
				resultSet.getInt("attempt_count"),
				resultSet.getTimestamp("window_started_at").toInstant(),
				instant(resultSet, "blocked_until"),
				instant(resultSet, "captcha_required_until"));
	}

	private Instant instant(ResultSet resultSet, String column) throws SQLException {
		Timestamp timestamp = resultSet.getTimestamp(column);
		return timestamp == null ? null : timestamp.toInstant();
	}

	private Timestamp timestamp(Instant instant) {
		return instant == null ? null : Timestamp.from(instant);
	}

	public record Bucket(
			String key,
			String action,
			int attemptCount,
			Instant windowStartedAt,
			Instant blockedUntil,
			Instant captchaRequiredUntil) {
	}
}
