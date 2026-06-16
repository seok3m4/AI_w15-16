package com.junglecamp.backend.admin.service;

import com.junglecamp.backend.admin.dto.AdminDtos;
import com.junglecamp.backend.admin.dto.AdminDtos.AdminActionResponse;
import com.junglecamp.backend.admin.dto.AdminDtos.AdminPageResponse;
import com.junglecamp.backend.admin.dto.AdminDtos.AdminUserItem;
import com.junglecamp.backend.admin.dto.AdminDtos.AgentRunItem;
import com.junglecamp.backend.admin.dto.AdminDtos.AuditLogItem;
import com.junglecamp.backend.admin.dto.AdminDtos.BoardReportItem;
import com.junglecamp.backend.admin.dto.AdminDtos.EconomySyncRunItem;
import com.junglecamp.backend.admin.dto.AdminDtos.HiddenContentItem;
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
				SELECT
					r.id,
					r.target_type,
					r.post_id,
					r.comment_id,
					p.title AS post_title,
					CASE
						WHEN r.target_type = 'COMMENT' THEN c.content
						ELSE p.content
					END AS target_content,
					CASE
						WHEN r.target_type = 'COMMENT' THEN c.author
						ELSE p.author
					END AS target_author,
					r.reporter_user_id,
					r.reason,
					r.detail,
					r.created_at
				FROM board_reports r
				JOIN board_posts p ON p.id = r.post_id
				LEFT JOIN board_comments c ON c.id = r.comment_id
				ORDER BY r.created_at DESC, r.id DESC
				LIMIT 100
				""", this::mapReport);
	}

	@Transactional
	public void dismissReport(Long reportId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		List<ReportSummary> reports = jdbcTemplate.query("""
				SELECT target_type, post_id, comment_id, reason
				FROM board_reports
				WHERE id = ?
				""", (resultSet, rowNumber) -> {
			Long commentId = resultSet.getLong("comment_id");
			if (resultSet.wasNull()) {
				commentId = null;
			}
			return new ReportSummary(
					resultSet.getString("target_type"),
					resultSet.getLong("post_id"),
					commentId,
					resultSet.getString("reason"));
		}, reportId);
		if (reports.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found");
		}
		int deleted = jdbcTemplate.update("DELETE FROM board_reports WHERE id = ?", reportId);
		if (deleted == 0) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found");
		}
		ReportSummary report = reports.get(0);
		auditRepository.record(
				admin.id(),
				"REPORT_DISMISS",
				"BOARD_REPORT",
				String.valueOf(reportId),
				"targetType=" + report.targetType()
						+ ",postId=" + report.postId()
						+ ",commentId=" + (report.commentId() == null ? "" : report.commentId())
						+ ",reason=" + report.reason());
	}

	@Transactional(readOnly = true)
	public List<HiddenContentItem> hiddenContent() {
		return jdbcTemplate.query("""
				SELECT *
				FROM (
					SELECT
						'POST' AS target_type,
						p.id AS post_id,
						CAST(NULL AS BIGINT) AS comment_id,
						p.title AS post_title,
						p.content AS content,
						p.author_user_id AS author_user_id,
						p.author AS author,
						p.hidden_at AS hidden_at,
						p.created_at AS created_at
					FROM board_posts p
					WHERE p.hidden_at IS NOT NULL
					UNION ALL
					SELECT
						'COMMENT' AS target_type,
						c.post_id AS post_id,
						c.id AS comment_id,
						p.title AS post_title,
						c.content AS content,
						c.author_user_id AS author_user_id,
						c.author AS author,
						c.hidden_at AS hidden_at,
						c.created_at AS created_at
					FROM board_comments c
					JOIN board_posts p ON p.id = c.post_id
					WHERE c.hidden_at IS NOT NULL
				) hidden_items
				ORDER BY hidden_at DESC, post_id DESC, comment_id DESC
				LIMIT 100
				""", this::mapHiddenContent);
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
		jdbcTemplate.update("""
				DELETE FROM board_notifications
				WHERE comment_id IN (
					SELECT id FROM board_comments WHERE id = ? OR parent_comment_id = ?
				)
				""", commentId, commentId);
		jdbcTemplate.update("""
				DELETE FROM board_reports
				WHERE comment_id IN (
					SELECT id FROM board_comments WHERE id = ? OR parent_comment_id = ?
				)
				""", commentId, commentId);
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
	public List<AgentRunItem> agentRuns(String visibility) {
		String normalizedVisibility = visibility == null || visibility.isBlank()
				? "active"
				: visibility.trim().toLowerCase();
		String filter = switch (normalizedVisibility) {
			case "active" -> "WHERE hidden_at IS NULL";
			case "hidden" -> "WHERE hidden_at IS NOT NULL";
			case "all" -> "";
			default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown visibility");
		};
		return jdbcTemplate.query("""
				SELECT id, user_id, run_type, status, summary, model, error_message, created_at, completed_at, hidden_at
				FROM agent_runs
				%s
				ORDER BY created_at DESC, id DESC
				LIMIT 100
				""".formatted(filter), this::mapAgentRun);
	}

	@Transactional
	public AdminActionResponse retryAgentRun(Long runId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		ensureExists("agent_runs", runId, "Agent run not found");
		auditRepository.record(admin.id(), "AGENT_RUN_RETRY_REQUEST", "AGENT_RUN", String.valueOf(runId), "");
		return new AdminActionResponse("queued");
	}

	@Transactional
	public void hardDeleteAgentRun(Long runId, Authentication authentication) {
		AppUser admin = currentAdmin(authentication);
		ensureExists("agent_runs", runId, "Agent run not found");
		jdbcTemplate.update("DELETE FROM agent_evidence_items WHERE run_id = ?", runId);
		jdbcTemplate.update("DELETE FROM agent_steps WHERE run_id = ?", runId);
		jdbcTemplate.update("DELETE FROM agent_messages WHERE run_id = ?", runId);
		jdbcTemplate.update("DELETE FROM agent_runs WHERE id = ?", runId);
		auditRepository.record(admin.id(), "AGENT_RUN_HARD_DELETE", "AGENT_RUN", String.valueOf(runId), "");
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

	private record ReportSummary(String targetType, Long postId, Long commentId, String reason) {
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
				resultSet.getString("post_title"),
				resultSet.getString("target_content"),
				resultSet.getString("target_author"),
				resultSet.getLong("reporter_user_id"),
				resultSet.getString("reason"),
				resultSet.getString("detail"),
				timestamp(resultSet.getTimestamp("created_at")));
	}

	private HiddenContentItem mapHiddenContent(ResultSet resultSet, int rowNumber) throws SQLException {
		Long commentId = resultSet.getLong("comment_id");
		if (resultSet.wasNull()) {
			commentId = null;
		}
		Long authorUserId = resultSet.getLong("author_user_id");
		if (resultSet.wasNull()) {
			authorUserId = null;
		}
		return new HiddenContentItem(
				resultSet.getString("target_type"),
				resultSet.getLong("post_id"),
				commentId,
				resultSet.getString("post_title"),
				resultSet.getString("content"),
				authorUserId,
				resultSet.getString("author"),
				timestamp(resultSet.getTimestamp("hidden_at")),
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
				timestamp(resultSet.getTimestamp("completed_at")),
				timestamp(resultSet.getTimestamp("hidden_at")));
	}

	private String timestamp(Timestamp timestamp) {
		return timestamp == null ? null : timestamp.toInstant().atOffset(ZoneOffset.UTC).toString();
	}
}
