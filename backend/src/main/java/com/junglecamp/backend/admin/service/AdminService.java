package com.junglecamp.backend.admin.service;

import com.junglecamp.backend.admin.dto.AdminDtos;
import com.junglecamp.backend.admin.dto.AdminDtos.AdminActionResponse;
import com.junglecamp.backend.admin.dto.AdminDtos.AdminPageResponse;
import com.junglecamp.backend.admin.dto.AdminDtos.AdminUserItem;
import com.junglecamp.backend.admin.dto.AdminDtos.AgentRunItem;
import com.junglecamp.backend.admin.dto.AdminDtos.AuditLogItem;
import com.junglecamp.backend.admin.dto.AdminDtos.BoardReportItem;
import com.junglecamp.backend.admin.dto.AdminDtos.EconomySyncRunItem;
import com.junglecamp.backend.admin.repository.AdminAuditRepository;
import com.junglecamp.backend.economy.service.EconomySyncService;
import com.junglecamp.backend.rag.service.RagIndexService;
import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.repository.AppUserRepository;
import com.junglecamp.backend.user.service.AppUserService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminService {

	private static final Set<String> ALLOWED_ROLES = Set.of("ROLE_USER", "ROLE_ADMIN");

	private final AppUserService appUserService;
	private final AppUserRepository userRepository;
	private final JdbcTemplate jdbcTemplate;
	private final RagIndexService ragIndexService;
	private final EconomySyncService economySyncService;
	private final AdminAuditRepository auditRepository;

	public AdminService(
			AppUserService appUserService,
			AppUserRepository userRepository,
			JdbcTemplate jdbcTemplate,
			RagIndexService ragIndexService,
			EconomySyncService economySyncService,
			AdminAuditRepository auditRepository) {
		this.appUserService = appUserService;
		this.userRepository = userRepository;
		this.jdbcTemplate = jdbcTemplate;
		this.ragIndexService = ragIndexService;
		this.economySyncService = economySyncService;
		this.auditRepository = auditRepository;
	}

	@Transactional(readOnly = true)
	public AdminPageResponse<AdminUserItem> users(String query, String role, String status, int page, int size) {
		int safePage = Math.max(0, page);
		int safeSize = Math.max(1, Math.min(size <= 0 ? 20 : size, 100));
		long total = userRepository.countUsers(query, role, status);
		List<AdminUserItem> items = userRepository.findUsers(query, role, status, safeSize, safePage * safeSize)
				.stream()
				.map(this::toUserItem)
				.toList();
		return new AdminPageResponse<>(items, safePage, safeSize, total, (int) Math.ceil((double) total / safeSize));
	}

	@Transactional
	public AdminUserItem updateRoles(Long userId, List<String> roles, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		LinkedHashSet<String> normalizedRoles = new LinkedHashSet<>();
		normalizedRoles.add("ROLE_USER");
		if (roles != null) {
			for (String role : roles) {
				if (role == null || role.isBlank()) {
					continue;
				}
				String normalized = role.trim();
				if (!ALLOWED_ROLES.contains(normalized)) {
					throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role");
				}
				normalizedRoles.add(normalized);
			}
		}
		AppUser updated = userRepository.updateRoles(userId, normalizedRoles.stream().toList());
		auditRepository.record(admin.id(), "USER_ROLES_UPDATE", "USER", String.valueOf(userId), String.join(",", updated.roles()));
		return toUserItem(updated);
	}

	@Transactional
	public AdminUserItem suspend(Long userId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		AppUser updated = userRepository.suspend(userId);
		auditRepository.record(admin.id(), "USER_SUSPEND", "USER", String.valueOf(userId), "");
		return toUserItem(updated);
	}

	@Transactional
	public AdminUserItem unsuspend(Long userId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		AppUser updated = userRepository.unsuspend(userId);
		auditRepository.record(admin.id(), "USER_UNSUSPEND", "USER", String.valueOf(userId), "");
		return toUserItem(updated);
	}

	@Transactional(readOnly = true)
	public List<BoardReportItem> reports() {
		return jdbcTemplate.query("""
				SELECT id, target_type, post_id, comment_id, reporter_user_id, reason, detail, created_at
				FROM board_reports
				ORDER BY created_at DESC, id DESC
				LIMIT 100
				""", this::mapReport);
	}

	@Transactional
	public void hidePost(Long postId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		int updated = jdbcTemplate.update("""
				UPDATE board_posts
				SET hidden_at = COALESCE(hidden_at, CURRENT_TIMESTAMP),
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""", postId);
		if (updated == 0) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
		}
		ragIndexService.deleteBoardPost(postId);
		auditRepository.record(admin.id(), "POST_HIDE", "BOARD_POST", String.valueOf(postId), "");
	}

	@Transactional
	public void hardDeletePost(Long postId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		ensureExists("board_posts", postId, "Post not found");
		ragIndexService.deleteBoardPost(postId);
		jdbcTemplate.update("DELETE FROM board_notifications WHERE post_id = ?", postId);
		jdbcTemplate.update("DELETE FROM board_reports WHERE post_id = ?", postId);
		jdbcTemplate.update("DELETE FROM board_post_likes WHERE post_id = ?", postId);
		jdbcTemplate.update("DELETE FROM board_post_tags WHERE post_id = ?", postId);
		jdbcTemplate.update("DELETE FROM board_comments WHERE post_id = ? AND parent_comment_id IS NOT NULL", postId);
		jdbcTemplate.update("DELETE FROM board_comments WHERE post_id = ?", postId);
		jdbcTemplate.update("DELETE FROM board_posts WHERE id = ?", postId);
		auditRepository.record(admin.id(), "POST_HARD_DELETE", "BOARD_POST", String.valueOf(postId), "");
	}

	@Transactional
	public void hideComment(Long commentId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		int updated = jdbcTemplate.update("""
				UPDATE board_comments
				SET hidden_at = COALESCE(hidden_at, CURRENT_TIMESTAMP),
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""", commentId);
		if (updated == 0) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
		}
		auditRepository.record(admin.id(), "COMMENT_HIDE", "BOARD_COMMENT", String.valueOf(commentId), "");
	}

	@Transactional
	public void hardDeleteComment(Long commentId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		ensureExists("board_comments", commentId, "Comment not found");
		jdbcTemplate.update("DELETE FROM board_notifications WHERE comment_id = ?", commentId);
		jdbcTemplate.update("DELETE FROM board_reports WHERE comment_id = ?", commentId);
		jdbcTemplate.update("DELETE FROM board_comments WHERE parent_comment_id = ?", commentId);
		jdbcTemplate.update("DELETE FROM board_comments WHERE id = ?", commentId);
		auditRepository.record(admin.id(), "COMMENT_HARD_DELETE", "BOARD_COMMENT", String.valueOf(commentId), "");
	}

	@Transactional(readOnly = true)
	public List<EconomySyncRunItem> economySyncRuns() {
		return jdbcTemplate.query("""
				SELECT id, source, started_at, finished_at, status, error_message
				FROM economy_sync_runs
				ORDER BY started_at DESC, id DESC
				LIMIT 100
				""", this::mapEconomySyncRun);
	}

	@Transactional
	public AdminActionResponse syncEconomy(Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		economySyncService.refreshInBackground();
		auditRepository.record(admin.id(), "ECONOMY_SYNC_NOW", "ECONOMY", "sync", "");
		return new AdminActionResponse("queued");
	}

	@Transactional(readOnly = true)
	public List<AgentRunItem> agentRuns() {
		return jdbcTemplate.query("""
				SELECT id, user_id, run_type, status, summary, model, error_message, created_at, completed_at
				FROM agent_runs
				ORDER BY created_at DESC, id DESC
				LIMIT 100
				""", this::mapAgentRun);
	}

	@Transactional
	public AdminActionResponse retryAgentRun(Long runId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		ensureExists("agent_runs", runId, "Agent run not found");
		auditRepository.record(admin.id(), "AGENT_RUN_RETRY_REQUEST", "AGENT_RUN", String.valueOf(runId), "");
		return new AdminActionResponse("queued");
	}

	@Transactional(readOnly = true)
	public AdminPageResponse<AuditLogItem> auditLogs() {
		List<AuditLogItem> items = auditRepository.findLatest(100);
		return new AdminPageResponse<>(items, 0, items.size(), items.size(), items.isEmpty() ? 0 : 1);
	}

	private AppUser currentAdmin(Authentication authentication) {
		return appUserService.currentUser(authentication);
	}

	private AdminUserItem toUserItem(AppUser user) {
		return new AdminUserItem(
				user.id(),
				user.provider(),
				user.email(),
				user.displayName(),
				user.nickname(),
				user.avatarUrl(),
				user.roles(),
				user.emailVerified(),
				user.suspended());
	}

	private void ensureExists(String table, Long id, String message) {
		Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE id = ?", Long.class, id);
		if (count == null || count == 0) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, message);
		}
	}

	private BoardReportItem mapReport(ResultSet resultSet, int rowNumber) throws SQLException {
		Long commentId = resultSet.getLong("comment_id");
		if (resultSet.wasNull()) {
			commentId = null;
		}
		return new BoardReportItem(
				resultSet.getLong("id"),
				resultSet.getString("target_type"),
				resultSet.getLong("post_id"),
				commentId,
				resultSet.getLong("reporter_user_id"),
				resultSet.getString("reason"),
				resultSet.getString("detail"),
				timestamp(resultSet.getTimestamp("created_at")));
	}

	private EconomySyncRunItem mapEconomySyncRun(ResultSet resultSet, int rowNumber) throws SQLException {
		return new EconomySyncRunItem(
				resultSet.getLong("id"),
				resultSet.getString("source"),
				timestamp(resultSet.getTimestamp("started_at")),
				timestamp(resultSet.getTimestamp("finished_at")),
				resultSet.getString("status"),
				resultSet.getString("error_message"));
	}

	private AgentRunItem mapAgentRun(ResultSet resultSet, int rowNumber) throws SQLException {
		return new AgentRunItem(
				resultSet.getLong("id"),
				resultSet.getLong("user_id"),
				resultSet.getString("run_type"),
				resultSet.getString("status"),
				resultSet.getString("summary"),
				resultSet.getString("model"),
				resultSet.getString("error_message"),
				timestamp(resultSet.getTimestamp("created_at")),
				timestamp(resultSet.getTimestamp("completed_at")));
	}

	private String timestamp(Timestamp timestamp) {
		return timestamp == null ? null : timestamp.toInstant().atOffset(ZoneOffset.UTC).toString();
	}
}
