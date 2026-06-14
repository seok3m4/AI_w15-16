package com.junglecamp.backend.user.repository;

import com.junglecamp.backend.user.model.AppUser;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AppUserRepository {

	private final JdbcTemplate jdbcTemplate;

	public AppUserRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public AppUser upsert(String provider, String providerUserId, String email, String displayName, String avatarUrl) {
		String normalizedProvider = requireText(provider, "provider");
		String normalizedProviderUserId = requireText(providerUserId, "providerUserId");
		String normalizedDisplayName = hasText(displayName) ? displayName.trim() : normalizedProviderUserId;
		String normalizedEmail = normalizeNullable(email);
		String normalizedAvatarUrl = normalizeNullable(avatarUrl);

		Optional<AppUser> existing = findByProviderAndProviderUserId(normalizedProvider, normalizedProviderUserId);
		if (existing.isPresent()) {
			update(existing.get().id(), normalizedEmail, normalizedDisplayName, normalizedAvatarUrl);
			return findById(existing.get().id()).orElseThrow();
		}

		try {
			jdbcTemplate.update("""
					INSERT INTO app_users (
						provider, provider_user_id, email, display_name, avatar_url,
						email_verified_at, roles
					)
					VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'google' THEN CURRENT_TIMESTAMP ELSE NULL END, 'ROLE_USER')
					""",
					normalizedProvider,
					normalizedProviderUserId,
					normalizedEmail,
					normalizedDisplayName,
					normalizedAvatarUrl,
					normalizedProvider);
		} catch (DuplicateKeyException exception) {
			findByProviderAndProviderUserId(normalizedProvider, normalizedProviderUserId)
					.ifPresent(user -> update(user.id(), normalizedEmail, normalizedDisplayName, normalizedAvatarUrl));
		}

		AppUser user = findByProviderAndProviderUserId(normalizedProvider, normalizedProviderUserId).orElseThrow();
		if ("google".equals(normalizedProvider) && !user.emailVerified()) {
			return markEmailVerified(user.id());
		}
		return user;
	}

	public AppUser createLocalUser(
			String email,
			String passwordHash,
			String nickname,
			boolean termsAccepted,
			boolean privacyAccepted,
			boolean marketingOptIn) {
		String normalizedEmail = requireText(email, "email").toLowerCase(Locale.ROOT);
		String normalizedNickname = requireText(nickname, "nickname");
		jdbcTemplate.update("""
				INSERT INTO app_users (
					provider, provider_user_id, email, display_name, avatar_url, nickname, password_hash, roles,
					terms_accepted_at, privacy_accepted_at, marketing_opt_in
				) VALUES (
					'local', ?, ?, ?, NULL, ?, ?, 'ROLE_USER',
					CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END,
					CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END,
					?
				)
				""",
				normalizedEmail,
				normalizedEmail,
				normalizedNickname,
				normalizedNickname,
				requireText(passwordHash, "passwordHash"),
				termsAccepted,
				privacyAccepted,
				marketingOptIn);
		return findByProviderAndProviderUserId("local", normalizedEmail).orElseThrow();
	}

	public boolean nicknameExists(String nickname) {
		if (!hasText(nickname)) {
			return false;
		}
		Integer count = jdbcTemplate.queryForObject("""
				SELECT COUNT(*)
				FROM app_users
				WHERE nickname = ?
				""", Integer.class, nickname.trim());
		return count != null && count > 0;
	}

	public Optional<LocalCredentials> findLocalCredentialsByEmail(String email) {
		if (!hasText(email)) {
			return Optional.empty();
		}
		List<LocalCredentials> credentials = jdbcTemplate.query("""
				SELECT id, provider, provider_user_id, email, display_name, avatar_url, nickname,
					email_verified_at, roles, suspended_at, password_hash
				FROM app_users
				WHERE provider = 'local' AND LOWER(email) = ?
				""",
				(resultSet, rowNumber) -> new LocalCredentials(
						mapUser(resultSet, rowNumber),
						resultSet.getString("password_hash")),
				email.trim().toLowerCase(Locale.ROOT));
		return credentials.stream().findFirst();
	}

	public Optional<AppUser> findById(Long id) {
		List<AppUser> users = jdbcTemplate.query("""
				SELECT id, provider, provider_user_id, email, display_name, avatar_url, nickname,
					email_verified_at, roles, suspended_at
				FROM app_users
				WHERE id = ?
				""", this::mapUser, id);
		return users.stream().findFirst();
	}

	public List<AppUser> findByIds(List<Long> ids) {
		if (ids == null || ids.isEmpty()) {
			return List.of();
		}
		String placeholders = String.join(",", ids.stream().map(id -> "?").toList());
		return jdbcTemplate.query("""
				SELECT id, provider, provider_user_id, email, display_name, avatar_url, nickname,
					email_verified_at, roles, suspended_at
				FROM app_users
				WHERE id IN (%s)
				""".formatted(placeholders), this::mapUser, ids.toArray());
	}

	public AppUser updateNickname(Long id, String nickname) {
		jdbcTemplate.update("""
				UPDATE app_users
				SET nickname = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""", nickname, id);
		return findById(id).orElseThrow(() -> new EmptyResultDataAccessException(1));
	}

	public Optional<AppUser> findByProviderAndProviderUserId(String provider, String providerUserId) {
		List<AppUser> users = jdbcTemplate.query("""
				SELECT id, provider, provider_user_id, email, display_name, avatar_url, nickname,
					email_verified_at, roles, suspended_at
				FROM app_users
				WHERE provider = ? AND provider_user_id = ?
				""", this::mapUser, provider, providerUserId);
		return users.stream().findFirst();
	}

	public Optional<AppUser> findByEmail(String email) {
		if (!hasText(email)) {
			return Optional.empty();
		}
		List<AppUser> users = jdbcTemplate.query("""
				SELECT id, provider, provider_user_id, email, display_name, avatar_url, nickname,
					email_verified_at, roles, suspended_at
				FROM app_users
				WHERE LOWER(email) = ?
				ORDER BY CASE WHEN provider = 'local' THEN 0 ELSE 1 END, id ASC
				LIMIT 1
				""", this::mapUser, email.trim().toLowerCase(Locale.ROOT));
		return users.stream().findFirst();
	}

	public AppUser markEmailVerified(Long userId) {
		jdbcTemplate.update("""
				UPDATE app_users
				SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""", userId);
		return findById(userId).orElseThrow(() -> new EmptyResultDataAccessException(1));
	}

	public AppUser updateRoles(Long userId, List<String> roles) {
		jdbcTemplate.update("""
				UPDATE app_users
				SET roles = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""", joinRoles(roles), userId);
		return findById(userId).orElseThrow(() -> new EmptyResultDataAccessException(1));
	}

	public AppUser suspend(Long userId) {
		jdbcTemplate.update("""
				UPDATE app_users
				SET suspended_at = CURRENT_TIMESTAMP,
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""", userId);
		return findById(userId).orElseThrow(() -> new EmptyResultDataAccessException(1));
	}

	public AppUser unsuspend(Long userId) {
		jdbcTemplate.update("""
				UPDATE app_users
				SET suspended_at = NULL,
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""", userId);
		return findById(userId).orElseThrow(() -> new EmptyResultDataAccessException(1));
	}

	public List<AppUser> findUsers(String query, String role, String status, int limit, int offset) {
		String normalizedQuery = hasText(query) ? "%" + query.trim().toLowerCase(Locale.ROOT) + "%" : null;
		String roleFilter = hasText(role) ? role.trim() : null;
		String statusFilter = hasText(status) ? status.trim() : null;
		return jdbcTemplate.query("""
				SELECT id, provider, provider_user_id, email, display_name, avatar_url, nickname,
					email_verified_at, roles, suspended_at
				FROM app_users
				WHERE (? IS NULL
					OR LOWER(COALESCE(email, '')) LIKE ?
					OR LOWER(display_name) LIKE ?
					OR LOWER(COALESCE(nickname, '')) LIKE ?)
				AND (? IS NULL OR roles LIKE ?)
				AND (? IS NULL
					OR (? = 'verified' AND email_verified_at IS NOT NULL)
					OR (? = 'pending' AND provider = 'local' AND email_verified_at IS NULL)
					OR (? = 'suspended' AND suspended_at IS NOT NULL)
					OR (? = 'active' AND suspended_at IS NULL))
				ORDER BY id DESC
				LIMIT ? OFFSET ?
				""",
				this::mapUser,
				normalizedQuery,
				normalizedQuery,
				normalizedQuery,
				normalizedQuery,
				roleFilter,
				roleFilter == null ? null : "%" + roleFilter + "%",
				statusFilter,
				statusFilter,
				statusFilter,
				statusFilter,
				statusFilter,
				limit,
				offset);
	}

	public long countUsers(String query, String role, String status) {
		String normalizedQuery = hasText(query) ? "%" + query.trim().toLowerCase(Locale.ROOT) + "%" : null;
		String roleFilter = hasText(role) ? role.trim() : null;
		String statusFilter = hasText(status) ? status.trim() : null;
		Long count = jdbcTemplate.queryForObject("""
				SELECT COUNT(*)
				FROM app_users
				WHERE (? IS NULL
					OR LOWER(COALESCE(email, '')) LIKE ?
					OR LOWER(display_name) LIKE ?
					OR LOWER(COALESCE(nickname, '')) LIKE ?)
				AND (? IS NULL OR roles LIKE ?)
				AND (? IS NULL
					OR (? = 'verified' AND email_verified_at IS NOT NULL)
					OR (? = 'pending' AND provider = 'local' AND email_verified_at IS NULL)
					OR (? = 'suspended' AND suspended_at IS NOT NULL)
					OR (? = 'active' AND suspended_at IS NULL))
				""",
				Long.class,
				normalizedQuery,
				normalizedQuery,
				normalizedQuery,
				normalizedQuery,
				roleFilter,
				roleFilter == null ? null : "%" + roleFilter + "%",
				statusFilter,
				statusFilter,
				statusFilter,
				statusFilter,
				statusFilter);
		return count == null ? 0 : count;
	}

	private void update(Long id, String email, String displayName, String avatarUrl) {
		jdbcTemplate.update("""
				UPDATE app_users
				SET email = ?, display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""", email, displayName, avatarUrl, id);
	}

	private AppUser mapUser(ResultSet resultSet, int rowNumber) throws SQLException {
		return new AppUser(
				resultSet.getLong("id"),
				resultSet.getString("provider"),
				resultSet.getString("provider_user_id"),
				resultSet.getString("email"),
				resultSet.getString("display_name"),
				resultSet.getString("avatar_url"),
				readOptionalColumn(resultSet, "nickname"),
				readOptionalInstant(resultSet, "email_verified_at"),
				parseRoles(readOptionalColumn(resultSet, "roles")),
				readOptionalInstant(resultSet, "suspended_at"));
	}

	private String readOptionalColumn(ResultSet resultSet, String columnName) throws SQLException {
		try {
			return resultSet.getString(columnName);
		} catch (SQLException exception) {
			return null;
		}
	}

	private Instant readOptionalInstant(ResultSet resultSet, String columnName) throws SQLException {
		try {
			Timestamp timestamp = resultSet.getTimestamp(columnName);
			return timestamp == null ? null : timestamp.toInstant();
		} catch (SQLException exception) {
			return null;
		}
	}

	private List<String> parseRoles(String roles) {
		if (!hasText(roles)) {
			return List.of("ROLE_USER");
		}
		return Arrays.stream(roles.split(","))
				.map(String::trim)
				.filter(this::hasText)
				.distinct()
				.toList();
	}

	private String joinRoles(List<String> roles) {
		List<String> normalizedRoles = roles == null
				? List.of()
				: roles.stream()
						.map(role -> requireText(role, "role"))
						.distinct()
						.toList();
		if (normalizedRoles.isEmpty()) {
			return "ROLE_USER";
		}
		return String.join(",", normalizedRoles);
	}

	private String normalizeNullable(String value) {
		return hasText(value) ? value.trim() : null;
	}

	private String requireText(String value, String fieldName) {
		if (!hasText(value)) {
			throw new IllegalArgumentException(fieldName + " must not be blank");
		}
		return value.trim();
	}

	private boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	public record LocalCredentials(AppUser user, String passwordHash) {
	}
}
