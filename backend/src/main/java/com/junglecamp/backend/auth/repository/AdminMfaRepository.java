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
public class AdminMfaRepository {

	private final JdbcTemplate jdbcTemplate;

	public AdminMfaRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public Optional<Setting> find(Long userId) {
		List<Setting> settings = jdbcTemplate.query("""
				SELECT user_id, secret_ciphertext, confirmed_at
				FROM admin_mfa_settings
				WHERE user_id = ?
				""", this::mapSetting, userId);
		return settings.stream().findFirst();
	}

	public void upsertPending(Long userId, String secretCiphertext) {
		int updated = jdbcTemplate.update("""
				UPDATE admin_mfa_settings
				SET secret_ciphertext = ?,
					confirmed_at = NULL,
					updated_at = CURRENT_TIMESTAMP
				WHERE user_id = ?
				""", secretCiphertext, userId);
		if (updated == 0) {
			jdbcTemplate.update("""
					INSERT INTO admin_mfa_settings (user_id, secret_ciphertext)
					VALUES (?, ?)
					""", userId, secretCiphertext);
		}
	}

	public void confirm(Long userId) {
		jdbcTemplate.update("""
				UPDATE admin_mfa_settings
				SET confirmed_at = CURRENT_TIMESTAMP,
					updated_at = CURRENT_TIMESTAMP
				WHERE user_id = ?
				""", userId);
	}

	public void replaceRecoveryCodes(Long userId, List<String> codeHashes) {
		jdbcTemplate.update("DELETE FROM admin_mfa_recovery_codes WHERE user_id = ?", userId);
		for (String codeHash : codeHashes) {
			jdbcTemplate.update("""
					INSERT INTO admin_mfa_recovery_codes (user_id, code_hash)
					VALUES (?, ?)
					""", userId, codeHash);
		}
	}

	public boolean consumeRecoveryCode(Long userId, String codeHash) {
		return jdbcTemplate.update("""
				UPDATE admin_mfa_recovery_codes
				SET consumed_at = CURRENT_TIMESTAMP
				WHERE user_id = ? AND code_hash = ? AND consumed_at IS NULL
				""", userId, codeHash) > 0;
	}

	private Setting mapSetting(ResultSet resultSet, int rowNumber) throws SQLException {
		Timestamp confirmedAt = resultSet.getTimestamp("confirmed_at");
		return new Setting(
				resultSet.getLong("user_id"),
				resultSet.getString("secret_ciphertext"),
				confirmedAt == null ? null : confirmedAt.toInstant());
	}

	public record Setting(Long userId, String secretCiphertext, Instant confirmedAt) {
		public boolean confirmed() {
			return confirmedAt != null;
		}
	}
}
