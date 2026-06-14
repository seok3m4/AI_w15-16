package com.junglecamp.backend.user.repository;

import com.junglecamp.backend.user.model.DashboardPreferences;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DashboardPreferenceRepository {

	private final JdbcTemplate jdbcTemplate;

	public DashboardPreferenceRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public Optional<DashboardPreferences> findByUserId(Long userId) {
		List<DashboardPreferences> preferences = jdbcTemplate.query("""
				SELECT core_metric_ids, watch_metric_ids, event_ids, report_ids, visible_sections
				FROM user_dashboard_preferences
				WHERE user_id = ?
				""", this::mapPreferences, userId);
		return preferences.stream().findFirst();
	}

	public void save(Long userId, DashboardPreferences preferences) {
		int updated = jdbcTemplate.update("""
				UPDATE user_dashboard_preferences
				SET core_metric_ids = ?,
					watch_metric_ids = ?,
					event_ids = ?,
					report_ids = ?,
					visible_sections = ?,
					updated_at = CURRENT_TIMESTAMP
				WHERE user_id = ?
				""",
				join(preferences.coreMetricIds()),
				join(preferences.watchMetricIds()),
				join(preferences.eventIds()),
				join(preferences.reportIds()),
				join(preferences.visibleSections()),
				userId);

		if (updated == 0) {
			jdbcTemplate.update("""
					INSERT INTO user_dashboard_preferences (
						user_id, core_metric_ids, watch_metric_ids, event_ids, report_ids, visible_sections
					) VALUES (?, ?, ?, ?, ?, ?)
					""",
					userId,
					join(preferences.coreMetricIds()),
					join(preferences.watchMetricIds()),
					join(preferences.eventIds()),
					join(preferences.reportIds()),
					join(preferences.visibleSections()));
		}
	}

	private DashboardPreferences mapPreferences(ResultSet resultSet, int rowNumber) throws SQLException {
		return new DashboardPreferences(
				split(resultSet.getString("core_metric_ids")),
				split(resultSet.getString("watch_metric_ids")),
				split(resultSet.getString("event_ids")),
				split(resultSet.getString("report_ids")),
				split(resultSet.getString("visible_sections")));
	}

	private String join(List<String> values) {
		return String.join(",", values);
	}

	private List<String> split(String value) {
		if (value == null || value.isBlank()) {
			return List.of();
		}

		return Arrays.stream(value.split(","))
				.map(String::trim)
				.filter(item -> !item.isBlank())
				.toList();
	}
}
