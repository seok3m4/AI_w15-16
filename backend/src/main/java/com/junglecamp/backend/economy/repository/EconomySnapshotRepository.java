package com.junglecamp.backend.economy.repository;

import com.junglecamp.backend.economy.definition.EconomyMetricDefinitions;
import com.junglecamp.backend.economy.definition.MetricDefinition;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AiBrief;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ExchangeRate;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MetricObservationPoint;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MetricSourceComparison;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.model.FredObservation;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class EconomySnapshotRepository {

	private final JdbcTemplate jdbcTemplate;

	public EconomySnapshotRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public List<EconomyMetricSnapshot> findLatestMetrics() {
		try {
			return jdbcTemplate.query("""
					SELECT id, series_id, name, category, "value", unit, period, base_date, source_name, source_url,
					       previous_value, change, change_percent, interpretation, updated_at
					FROM economy_metric_snapshots
					""", this::mapMetric).stream()
					.sorted((left, right) -> Integer.compare(
							EconomyMetricDefinitions.orderOf(left.id()),
							EconomyMetricDefinitions.orderOf(right.id())))
					.toList();
		} catch (DataAccessException exception) {
			return List.of();
		}
	}

	public List<EconomicEvent> findEvents() {
		try {
			return jdbcTemplate.query("""
					SELECT id, title, release_date_time, importance, previous_value, forecast_value, actual_value,
					       unit, status, interpretation, source_name, source_url, related_metric_ids,
					       source_type, source_event_id, event_category, updated_at
					FROM economy_events
					ORDER BY release_date_time ASC
					""", this::mapEvent);
		} catch (DataAccessException exception) {
			return List.of();
		}
	}

	public List<ExchangeRate> findExchangeRates() {
		try {
			return jdbcTemplate.query("""
					SELECT currency_code, currency_name, base_date, deal_base_rate, ttb, tts,
					       source_name, source_url, updated_at
					FROM economy_exchange_rates
					ORDER BY CASE currency_code
						WHEN 'USD' THEN 0
						WHEN 'JPY' THEN 1
						WHEN 'EUR' THEN 2
						WHEN 'CNY' THEN 3
						ELSE 100
					END, currency_code ASC
					""", this::mapExchangeRate);
		} catch (DataAccessException exception) {
			return List.of();
		}
	}

	public Optional<OffsetDateTime> latestExchangeRatesUpdatedAt() {
		try {
			return jdbcTemplate.query("""
					SELECT MAX(updated_at) AS updated_at
					FROM economy_exchange_rates
					""", resultSet -> {
				if (!resultSet.next()) {
					return Optional.empty();
				}
				Timestamp timestamp = resultSet.getTimestamp("updated_at");
				return timestamp == null
						? Optional.empty()
						: Optional.of(timestamp.toInstant().atOffset(ZoneOffset.UTC));
			});
		} catch (DataAccessException exception) {
			return Optional.empty();
		}
	}

	public List<EconomicEvent> findEvents(
			LocalDate from,
			LocalDate to,
			String source,
			String importance,
			String category,
			String relatedMetricId) {
		try {
			List<Object> args = new ArrayList<>();
			StringBuilder sql = new StringBuilder("""
					SELECT id, title, release_date_time, importance, previous_value, forecast_value, actual_value,
					       unit, status, interpretation, source_name, source_url, related_metric_ids,
					       source_type, source_event_id, event_category, updated_at
					FROM economy_events
					WHERE 1 = 1
					""");
			if (from != null) {
				sql.append(" AND release_date_time >= ?");
				args.add(Timestamp.valueOf(from.atStartOfDay()));
			}
			if (to != null) {
				sql.append(" AND release_date_time < ?");
				args.add(Timestamp.valueOf(to.plusDays(1).atStartOfDay()));
			}
			if (source != null && !source.isBlank()) {
				sql.append(" AND LOWER(source_type) = LOWER(?)");
				args.add(source.trim());
			}
			if (importance != null && !importance.isBlank()) {
				sql.append(" AND LOWER(importance) = LOWER(?)");
				args.add(importance.trim());
			}
			if (category != null && !category.isBlank()) {
				sql.append(" AND LOWER(event_category) = LOWER(?)");
				args.add(category.trim());
			}
			if (relatedMetricId != null && !relatedMetricId.isBlank()) {
				sql.append(" AND (',' || related_metric_ids || ',') LIKE ?");
				args.add("%," + relatedMetricId.trim() + ",%");
			}
			sql.append(" ORDER BY release_date_time ASC");
			return jdbcTemplate.query(sql.toString(), this::mapEvent, args.toArray());
		} catch (DataAccessException exception) {
			return List.of();
		}
	}

	public Optional<AiBrief> findLatestBrief() {
		return findLatestBrief(SupportedLocale.KO);
	}

	public Optional<AiBrief> findLatestBrief(SupportedLocale locale) {
		try {
			List<AiBrief> briefs = jdbcTemplate.query("""
					SELECT summary, status_label, korea_impact, risks, evidence_metric_ids, evidence_event_ids,
					       generation_status, generated_at
					FROM economy_briefs
					WHERE locale = ?
					ORDER BY generated_at DESC, id DESC
					LIMIT 1
					""", this::mapBrief, localeTag(locale));
			return briefs.stream().findFirst();
		} catch (DataAccessException exception) {
			return Optional.empty();
		}
	}

	public Optional<OffsetDateTime> latestMetricsUpdatedAt() {
		try {
			return jdbcTemplate.query("""
					SELECT MAX(updated_at) AS updated_at
					FROM economy_metric_snapshots
					""", resultSet -> {
				if (!resultSet.next()) {
					return Optional.empty();
				}
				Timestamp timestamp = resultSet.getTimestamp("updated_at");
				return timestamp == null
						? Optional.empty()
						: Optional.of(timestamp.toInstant().atOffset(ZoneOffset.UTC));
			});
		} catch (DataAccessException exception) {
			return Optional.empty();
		}
	}

	public void replaceMetrics(List<EconomyMetricSnapshot> snapshots) {
		for (EconomyMetricSnapshot snapshot : snapshots) {
			jdbcTemplate.update("""
					INSERT INTO economy_metric_snapshots (
						id, series_id, name, category, "value", unit, period, base_date, source_name, source_url,
						previous_value, change, change_percent, interpretation, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT (id) DO UPDATE SET
						series_id = EXCLUDED.series_id,
						name = EXCLUDED.name,
						category = EXCLUDED.category,
						"value" = EXCLUDED."value",
						unit = EXCLUDED.unit,
						period = EXCLUDED.period,
						base_date = EXCLUDED.base_date,
						source_name = EXCLUDED.source_name,
						source_url = EXCLUDED.source_url,
						previous_value = EXCLUDED.previous_value,
						change = EXCLUDED.change,
						change_percent = EXCLUDED.change_percent,
						interpretation = EXCLUDED.interpretation,
						updated_at = EXCLUDED.updated_at
					""",
					snapshot.id(),
					EconomyMetricDefinitions.byId(snapshot.id())
							.map(MetricDefinition::seriesId)
							.orElse(snapshot.id()),
					snapshot.name(),
					snapshot.category(),
					snapshot.value(),
					snapshot.unit(),
					snapshot.period(),
					snapshot.baseDate(),
					snapshot.sourceName(),
					snapshot.sourceUrl(),
					snapshot.previousValue(),
					snapshot.change(),
					snapshot.changePercent(),
					snapshot.interpretation(),
					Timestamp.from(OffsetDateTime.parse(snapshot.updatedAt()).toInstant()));
		}
	}

	public void replaceMetricObservations(MetricDefinition definition, List<FredObservation> observations) {
		for (FredObservation observation : observations) {
			if (observation.value() == null || observation.value().isBlank() || ".".equals(observation.value())) {
				continue;
			}
			jdbcTemplate.update("""
					INSERT INTO economy_metric_observations (
						metric_id, series_id, observation_date, "value", unit, source_name, source_url, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT (metric_id, observation_date) DO UPDATE SET
						series_id = EXCLUDED.series_id,
						"value" = EXCLUDED."value",
						unit = EXCLUDED.unit,
						source_name = EXCLUDED.source_name,
						source_url = EXCLUDED.source_url,
						updated_at = EXCLUDED.updated_at
					""",
					definition.id(),
					definition.seriesId(),
					java.sql.Date.valueOf(observation.date()),
					observation.value(),
					definition.unit(),
					"FRED",
					definition.sourceUrl(),
					Timestamp.from(OffsetDateTime.now().toInstant()));
		}
	}

	public List<MetricObservationPoint> findMetricObservations(String metricId, LocalDate startDate) {
		try {
			return jdbcTemplate.query("""
					SELECT observation_date, "value"
					FROM economy_metric_observations
					WHERE metric_id = ?
					  AND observation_date >= ?
					ORDER BY observation_date ASC
					""", (resultSet, rowNumber) -> new MetricObservationPoint(
					resultSet.getDate("observation_date").toLocalDate().toString(),
					resultSet.getString("value")),
					metricId,
					java.sql.Date.valueOf(startDate));
		} catch (DataAccessException exception) {
			return List.of();
		}
	}

	public List<MetricSourceComparison> findSourceComparisons(String metricId) {
		try {
			return jdbcTemplate.query("""
					SELECT provider, provider_series_id, "value", unit,
					       raw_value, raw_unit, normalized_value, normalized_unit, comparison_note,
					       base_date, source_url, status, error_message, updated_at
					FROM economy_metric_source_values
					WHERE metric_id = ?
					ORDER BY provider ASC, provider_series_id ASC
					""", this::mapSourceComparison, metricId);
		} catch (DataAccessException exception) {
			return List.of();
		}
	}

	public void upsertSourceComparison(String metricId, MetricSourceComparison comparison) {
		jdbcTemplate.update("""
				INSERT INTO economy_metric_source_values (
					metric_id, provider, provider_series_id, "value", unit, base_date, source_url,
					status, error_message, raw_value, raw_unit, normalized_value, normalized_unit,
					comparison_note, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (metric_id, provider, provider_series_id) DO UPDATE SET
					"value" = EXCLUDED."value",
					unit = EXCLUDED.unit,
					base_date = EXCLUDED.base_date,
					source_url = EXCLUDED.source_url,
					status = EXCLUDED.status,
					error_message = EXCLUDED.error_message,
					raw_value = EXCLUDED.raw_value,
					raw_unit = EXCLUDED.raw_unit,
					normalized_value = EXCLUDED.normalized_value,
					normalized_unit = EXCLUDED.normalized_unit,
					comparison_note = EXCLUDED.comparison_note,
					updated_at = EXCLUDED.updated_at
				""",
				metricId,
				comparison.provider(),
				comparison.providerSeriesId(),
				comparison.value(),
				comparison.unit(),
				comparison.baseDate(),
				comparison.sourceUrl(),
				comparison.status(),
				comparison.errorMessage(),
				comparison.rawValue(),
				comparison.rawUnit(),
				comparison.normalizedValue(),
				comparison.normalizedUnit(),
				comparison.comparisonNote(),
				Timestamp.from(OffsetDateTime.parse(comparison.updatedAt()).toInstant()));
	}

	public void upsertEvent(EconomicEvent event) {
		jdbcTemplate.update("""
				INSERT INTO economy_events (
					id, title, release_date_time, importance, previous_value, forecast_value, actual_value,
					unit, status, interpretation, source_name, source_url, related_metric_ids,
					source_type, source_event_id, event_category, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (id) DO UPDATE SET
					title = EXCLUDED.title,
					release_date_time = EXCLUDED.release_date_time,
					importance = EXCLUDED.importance,
					previous_value = EXCLUDED.previous_value,
					forecast_value = EXCLUDED.forecast_value,
					actual_value = EXCLUDED.actual_value,
					unit = EXCLUDED.unit,
					status = EXCLUDED.status,
					interpretation = EXCLUDED.interpretation,
					source_name = EXCLUDED.source_name,
					source_url = EXCLUDED.source_url,
					related_metric_ids = EXCLUDED.related_metric_ids,
					source_type = EXCLUDED.source_type,
					source_event_id = EXCLUDED.source_event_id,
					event_category = EXCLUDED.event_category,
					updated_at = EXCLUDED.updated_at
				""",
				event.id(),
				event.title(),
				Timestamp.from(OffsetDateTime.parse(event.releaseDateTime()).toInstant()),
				event.importance(),
				event.previousValue(),
				event.forecastValue(),
				event.actualValue(),
				event.unit(),
				event.status(),
				event.interpretation(),
				event.sourceName(),
				event.sourceUrl(),
				String.join(",", event.relatedMetricIds()),
				event.sourceType(),
				event.sourceEventId(),
				event.eventCategory(),
				Timestamp.from(OffsetDateTime.parse(event.updatedAt()).toInstant()));
	}

	public void replaceExchangeRates(List<ExchangeRate> rates) {
		for (ExchangeRate rate : rates) {
			jdbcTemplate.update("""
					INSERT INTO economy_exchange_rates (
						currency_code, currency_name, base_date, deal_base_rate, ttb, tts,
						source_name, source_url, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT (currency_code) DO UPDATE SET
						currency_name = EXCLUDED.currency_name,
						base_date = EXCLUDED.base_date,
						deal_base_rate = EXCLUDED.deal_base_rate,
						ttb = EXCLUDED.ttb,
						tts = EXCLUDED.tts,
						source_name = EXCLUDED.source_name,
						source_url = EXCLUDED.source_url,
						updated_at = EXCLUDED.updated_at
					""",
					rate.currencyCode(),
					rate.currencyName(),
					java.sql.Date.valueOf(rate.baseDate()),
					rate.dealBaseRate(),
					rate.ttb(),
					rate.tts(),
					rate.sourceName(),
					rate.sourceUrl(),
					Timestamp.from(OffsetDateTime.parse(rate.updatedAt()).toInstant()));
		}
	}

	public void saveBrief(AiBrief brief, String model) {
		saveBrief(brief, model, SupportedLocale.KO);
	}

	public void saveBrief(AiBrief brief, String model, SupportedLocale locale) {
		jdbcTemplate.update("""
				INSERT INTO economy_briefs (
					summary, status_label, korea_impact, risks, evidence_metric_ids, evidence_event_ids,
					model, locale, generation_status, generated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				""",
				brief.summary(),
				brief.statusLabel(),
				brief.koreaImpact(),
				String.join("\n", brief.risks()),
				String.join(",", brief.evidenceMetricIds()),
				String.join(",", brief.evidenceEventIds()),
				model,
				localeTag(locale),
				brief.generationStatus(),
				Timestamp.from(OffsetDateTime.parse(brief.generatedAt()).toInstant()));
	}

	public void recordSyncRun(String source, OffsetDateTime startedAt, OffsetDateTime finishedAt, String status, String errorMessage) {
		try {
			jdbcTemplate.update("""
					INSERT INTO economy_sync_runs (source, started_at, finished_at, status, error_message)
					VALUES (?, ?, ?, ?, ?)
					""",
					source,
					Timestamp.from(startedAt.toInstant()),
					Timestamp.from(finishedAt.toInstant()),
					status,
					errorMessage);
		} catch (DataAccessException ignored) {
			// If migration has not run yet, the API should still return an empty fallback dashboard.
		}
	}

	private EconomyMetricSnapshot mapMetric(ResultSet resultSet, int rowNumber) throws SQLException {
		return new EconomyMetricSnapshot(
				resultSet.getString("id"),
				resultSet.getString("series_id"),
				resultSet.getString("name"),
				resultSet.getString("category"),
				resultSet.getString("value"),
				resultSet.getString("unit"),
				resultSet.getString("period"),
				resultSet.getString("base_date"),
				resultSet.getString("source_name"),
				resultSet.getString("source_url"),
				resultSet.getString("previous_value"),
				resultSet.getString("change"),
				resultSet.getString("change_percent"),
				resultSet.getString("interpretation"),
				resultSet.getTimestamp("updated_at").toInstant().atOffset(ZoneOffset.UTC).toString());
	}

	private EconomicEvent mapEvent(ResultSet resultSet, int rowNumber) throws SQLException {
		return new EconomicEvent(
				resultSet.getString("id"),
				resultSet.getString("title"),
				resultSet.getTimestamp("release_date_time").toInstant().atOffset(ZoneOffset.UTC).toString(),
				resultSet.getString("importance"),
				resultSet.getString("previous_value"),
				resultSet.getString("forecast_value"),
				resultSet.getString("actual_value"),
				resultSet.getString("unit"),
				resultSet.getString("status"),
				resultSet.getString("interpretation"),
				resultSet.getString("source_name"),
				resultSet.getString("source_url"),
				splitCsv(resultSet.getString("related_metric_ids")),
				readOptionalString(resultSet, "source_type", "FRED"),
				readOptionalString(resultSet, "source_event_id", ""),
				readOptionalString(resultSet, "event_category", "general"),
				readOptionalTimestamp(resultSet, "updated_at")
						.toInstant()
						.atOffset(ZoneOffset.UTC)
						.toString(),
				forecastStatus(resultSet.getString("forecast_value")),
				null);
	}

	private ExchangeRate mapExchangeRate(ResultSet resultSet, int rowNumber) throws SQLException {
		return new ExchangeRate(
				resultSet.getString("currency_code"),
				resultSet.getString("currency_name"),
				resultSet.getDate("base_date").toLocalDate().toString(),
				resultSet.getString("deal_base_rate"),
				resultSet.getString("ttb"),
				resultSet.getString("tts"),
				resultSet.getString("source_name"),
				resultSet.getString("source_url"),
				resultSet.getTimestamp("updated_at").toInstant().atOffset(ZoneOffset.UTC).toString());
	}

	private MetricSourceComparison mapSourceComparison(ResultSet resultSet, int rowNumber) throws SQLException {
		return new MetricSourceComparison(
				resultSet.getString("provider"),
				resultSet.getString("provider_series_id"),
				resultSet.getString("value"),
				resultSet.getString("unit"),
				readOptionalString(resultSet, "raw_value", ""),
				readOptionalString(resultSet, "raw_unit", ""),
				readOptionalString(resultSet, "normalized_value", ""),
				readOptionalString(resultSet, "normalized_unit", ""),
				readOptionalString(resultSet, "comparison_note", ""),
				resultSet.getString("base_date"),
				resultSet.getString("source_url"),
				resultSet.getString("status"),
				resultSet.getString("error_message"),
				resultSet.getTimestamp("updated_at").toInstant().atOffset(ZoneOffset.UTC).toString());
	}

	private AiBrief mapBrief(ResultSet resultSet, int rowNumber) throws SQLException {
		return new AiBrief(
				resultSet.getString("summary"),
				resultSet.getString("status_label"),
				splitCsv(resultSet.getString("evidence_metric_ids")),
				splitCsv(resultSet.getString("evidence_event_ids")),
				resultSet.getString("korea_impact"),
				resultSet.getString("risks").lines().filter(line -> !line.isBlank()).toList(),
				resultSet.getTimestamp("generated_at").toInstant().atOffset(ZoneOffset.UTC).toString(),
				resultSet.getString("generation_status"));
	}

	private List<String> splitCsv(String value) {
		if (value == null || value.isBlank()) {
			return List.of();
		}
		return Arrays.stream(value.split(","))
				.map(String::trim)
				.filter(item -> !item.isBlank())
				.toList();
	}

	private String localeTag(SupportedLocale locale) {
		return (locale == null ? SupportedLocale.KO : locale).tag();
	}

	private String readOptionalString(ResultSet resultSet, String column, String fallback) {
		try {
			String value = resultSet.getString(column);
			return value == null ? fallback : value;
		} catch (SQLException exception) {
			return fallback;
		}
	}

	private Timestamp readOptionalTimestamp(ResultSet resultSet, String column) {
		try {
			Timestamp timestamp = resultSet.getTimestamp(column);
			return timestamp == null ? Timestamp.valueOf(LocalDateTime.now()) : timestamp;
		} catch (SQLException exception) {
			return Timestamp.valueOf(LocalDateTime.now());
		}
	}

	private String forecastStatus(String forecastValue) {
		return forecastValue == null || forecastValue.isBlank()
				? "paid_or_manual_required"
				: "available";
	}
}
