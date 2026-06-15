package com.junglecamp.backend.admin.repository;

import com.junglecamp.backend.admin.dto.AdminDtos;
import com.junglecamp.backend.admin.dto.AdminDtos.AuditLogItem;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminAuditRepository {

	private final JdbcTemplate jdbcTemplate;

	public AdminAuditRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public void record(Long adminUserId, String action, String targetType, String targetId, String detail) {
		jdbcTemplate.update("""
				INSERT INTO admin_audit_logs (admin_user_id, action, target_type, target_id, detail)
				VALUES (?, ?, ?, ?, ?)
				""",
				adminUserId,
				action,
				targetType,
				targetId,
				detail == null ? "" : detail);
	}

	public List<AuditLogItem> findLatest(int limit) {
		return jdbcTemplate.query("""
				SELECT id, admin_user_id, action, target_type, target_id, detail, created_at
				FROM admin_audit_logs
				ORDER BY created_at DESC, id DESC
				LIMIT ?
				""", this::map, Math.max(1, Math.min(limit, 100)));
	}

	private AuditLogItem map(ResultSet resultSet, int rowNumber) throws SQLException {
		return new AuditLogItem(
				resultSet.getLong("id"),
				resultSet.getLong("admin_user_id"),
				resultSet.getString("action"),
				resultSet.getString("target_type"),
				resultSet.getString("target_id"),
				resultSet.getString("detail"),
				timestamp(resultSet.getTimestamp("created_at")));
	}

	private String timestamp(Timestamp timestamp) {
		return timestamp == null ? null : timestamp.toInstant().atOffset(ZoneOffset.UTC).toString();
	}
}
