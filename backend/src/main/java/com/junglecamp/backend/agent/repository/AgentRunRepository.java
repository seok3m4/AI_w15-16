package com.junglecamp.backend.agent.repository;

import com.junglecamp.backend.agent.dto.AgentDtos;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentEvidenceItemDto;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentMessageDto;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunDetail;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunSummary;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentTraceStepDto;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerBriefingResponse;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerChatResponse;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AgentRunRepository {

	private final JdbcTemplate jdbcTemplate;

	public AgentRunRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public Long createRun(Long userId, String model) {
		return createRun(userId, model, "briefing", SupportedLocale.KO);
	}

	public Long createRun(Long userId, String model, String runType) {
		return createRun(userId, model, runType, SupportedLocale.KO);
	}

	public Long createRun(Long userId, String model, String runType, SupportedLocale locale) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement("""
					INSERT INTO agent_runs (
						user_id, run_type, status, summary, status_label, korea_impact,
						risks, evidence_metric_ids, evidence_event_ids, model, locale
					)
					VALUES (?, ?, 'running', '', '', '', '', '', '', ?, ?)
					""", new String[] { "id" });
			statement.setLong(1, userId);
			statement.setString(2, runType);
			statement.setString(3, model);
			statement.setString(4, localeTag(locale));
			return statement;
		}, keyHolder);
		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("Agent run id was not generated");
		}
		return key.longValue();
	}

	public void completeRun(Long runId, AgentWorkerBriefingResponse response, String status, String errorMessage) {
		jdbcTemplate.update("""
				UPDATE agent_runs
				SET status = ?,
					summary = ?,
					status_label = ?,
					korea_impact = ?,
					risks = ?,
					evidence_metric_ids = ?,
					evidence_event_ids = ?,
					evidence_news_ids = ?,
					evidence_rag_chunk_ids = ?,
					error_message = ?,
					updated_at = CURRENT_TIMESTAMP,
					completed_at = CURRENT_TIMESTAMP
				WHERE id = ?
				""",
				status,
				nullToEmpty(response.summary()),
				nullToEmpty(response.statusLabel()),
				nullToEmpty(response.koreaImpact()),
				joinLines(response.risks()),
				joinComma(response.evidenceMetricIds()),
				joinComma(response.evidenceEventIds()),
				joinComma(response.evidenceNewsIds()),
				joinComma(response.evidenceRagChunkIds()),
				errorMessage,
				runId);
	}

	public void saveEvidenceItems(Long runId, List<AgentEvidenceItemDto> evidenceItems) {
		saveEvidenceItems(runId, null, evidenceItems);
	}

	public void saveEvidenceItems(Long runId, Long messageId, List<AgentEvidenceItemDto> evidenceItems) {
		for (AgentEvidenceItemDto item : emptyIfNull(evidenceItems)) {
			jdbcTemplate.update("""
					INSERT INTO agent_evidence_items (
						run_id, message_id, evidence_id, evidence_type, title, source_name, source_url,
						observed_at, snippet, payload
					)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					""",
					runId,
					messageId,
					nullToEmpty(item.id()),
					nullToEmpty(item.type()),
					nullToEmpty(item.title()),
					nullToEmpty(item.sourceName()),
					nullToEmpty(item.sourceUrl()),
					item.observedAt(),
					nullToEmpty(item.snippet()),
					nullToEmpty(item.payload()));
		}
	}

	public void saveSteps(Long runId, List<AgentTraceStepDto> steps) {
		saveSteps(runId, null, steps);
	}

	public void saveSteps(Long runId, Long messageId, List<AgentTraceStepDto> steps) {
		int nextOrder = stepCount(runId);
		for (AgentTraceStepDto step : steps) {
			jdbcTemplate.update("""
					INSERT INTO agent_steps (run_id, message_id, step_order, agent, action, guardrail, result)
					VALUES (?, ?, ?, ?, ?, ?, ?)
					""",
					runId,
					messageId,
					nextOrder++,
					nullToEmpty(step.agent()),
					nullToEmpty(step.action()),
					nullToEmpty(step.guardrail()),
					nullToEmpty(step.result()));
		}
	}

	public AgentMessageDto appendMessage(Long runId, String role, String content) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement("""
					INSERT INTO agent_messages (run_id, role, content)
					VALUES (?, ?, ?)
					""", new String[] { "id" });
			statement.setLong(1, runId);
			statement.setString(2, role);
			statement.setString(3, content);
			return statement;
		}, keyHolder);
		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("Agent message id was not generated");
		}
		return findMessage(key.longValue()).orElseThrow();
	}

	public AgentMessageDto appendAssistantMessage(Long runId, AgentWorkerChatResponse response) {
		KeyHolder keyHolder = new GeneratedKeyHolder();
		jdbcTemplate.update(connection -> {
			PreparedStatement statement = connection.prepareStatement("""
					INSERT INTO agent_messages (
						run_id, role, content, answer_status, evidence_metric_ids,
						evidence_event_ids, evidence_news_ids, evidence_rag_chunk_ids
					)
					VALUES (?, 'assistant', ?, ?, ?, ?, ?, ?)
					""", new String[] { "id" });
			statement.setLong(1, runId);
			statement.setString(2, nullToEmpty(response.answer()));
			statement.setString(3, nullToEmpty(response.answerStatus()));
			statement.setString(4, joinComma(response.evidenceMetricIds()));
			statement.setString(5, joinComma(response.evidenceEventIds()));
			statement.setString(6, joinComma(response.evidenceNewsIds()));
			statement.setString(7, joinComma(response.evidenceRagChunkIds()));
			return statement;
		}, keyHolder);
		Number key = keyHolder.getKey();
		if (key == null) {
			throw new IllegalStateException("Agent message id was not generated");
		}
		return findMessage(key.longValue()).orElseThrow();
	}

	public List<AgentRunSummary> findRunsForUser(Long userId) {
		return findRunsForUser(userId, SupportedLocale.KO);
	}

	public List<AgentRunSummary> findRunsForUser(Long userId, SupportedLocale locale) {
		return jdbcTemplate.query("""
				SELECT id, run_type, status, summary, status_label, korea_impact, risks,
					evidence_metric_ids, evidence_event_ids, evidence_news_ids,
					evidence_rag_chunk_ids, model, locale, error_message,
					created_at, completed_at
				FROM agent_runs
				WHERE user_id = ? AND locale = ? AND hidden_at IS NULL
				ORDER BY created_at DESC, id DESC
				LIMIT 10
				""", this::mapRun, userId, localeTag(locale));
	}

	public Optional<AgentRunDetail> findDetailForUser(Long runId, Long userId) {
		List<AgentRunSummary> runs = jdbcTemplate.query("""
				SELECT id, run_type, status, summary, status_label, korea_impact, risks,
					evidence_metric_ids, evidence_event_ids, evidence_news_ids,
					evidence_rag_chunk_ids, model, locale, error_message,
					created_at, completed_at
				FROM agent_runs
				WHERE id = ? AND user_id = ? AND hidden_at IS NULL
				""", this::mapRun, runId, userId);
		return runs.stream()
				.findFirst()
				.map(run -> new AgentRunDetail(run, findSteps(run.id()), findMessages(run.id()), findEvidenceItems(run.id())));
	}

	public Optional<AgentRunDetail> findLatestDetailForUserByType(Long userId, String runType) {
		return findLatestDetailForUserByType(userId, runType, SupportedLocale.KO);
	}

	public Optional<AgentRunDetail> findLatestDetailForUserByType(Long userId, String runType, SupportedLocale locale) {
		List<AgentRunSummary> runs = jdbcTemplate.query("""
				SELECT id, run_type, status, summary, status_label, korea_impact, risks,
					evidence_metric_ids, evidence_event_ids, evidence_news_ids,
					evidence_rag_chunk_ids, model, locale, error_message,
					created_at, completed_at
				FROM agent_runs
				WHERE user_id = ? AND run_type = ? AND locale = ? AND hidden_at IS NULL
				ORDER BY created_at DESC, id DESC
				LIMIT 1
				""", this::mapRun, userId, runType, localeTag(locale));
		return runs.stream()
				.findFirst()
				.map(run -> new AgentRunDetail(run, findSteps(run.id()), findMessages(run.id()), findEvidenceItems(run.id())));
	}

	public boolean hideRunForUser(Long runId, Long userId) {
		int updated = jdbcTemplate.update("""
				UPDATE agent_runs
				SET hidden_at = CURRENT_TIMESTAMP,
					updated_at = CURRENT_TIMESTAMP
				WHERE id = ? AND user_id = ? AND hidden_at IS NULL
				""", runId, userId);
		return updated > 0;
	}

	private Optional<AgentMessageDto> findMessage(Long messageId) {
		List<AgentMessageDto> messages = jdbcTemplate.query("""
				SELECT run_id, id, role, content, answer_status, evidence_metric_ids,
					evidence_event_ids, evidence_news_ids, evidence_rag_chunk_ids, created_at
				FROM agent_messages
				WHERE id = ?
				""", this::mapMessage, messageId);
		return messages.stream().findFirst();
	}

	private List<AgentTraceStepDto> findSteps(Long runId) {
		return findSteps(runId, null);
	}

	private List<AgentTraceStepDto> findSteps(Long runId, Long messageId) {
		if (messageId != null) {
			return jdbcTemplate.query("""
					SELECT agent, action, guardrail, result
					FROM agent_steps
					WHERE run_id = ? AND message_id = ?
					ORDER BY step_order ASC, id ASC
					""", (resultSet, rowNumber) -> new AgentTraceStepDto(
					resultSet.getString("agent"),
					resultSet.getString("action"),
					resultSet.getString("guardrail"),
					resultSet.getString("result")), runId, messageId);
		}
		return jdbcTemplate.query("""
				SELECT agent, action, guardrail, result
				FROM agent_steps
				WHERE run_id = ?
				ORDER BY step_order ASC, id ASC
				""", (resultSet, rowNumber) -> new AgentTraceStepDto(
				resultSet.getString("agent"),
				resultSet.getString("action"),
				resultSet.getString("guardrail"),
				resultSet.getString("result")), runId);
	}

	private List<AgentMessageDto> findMessages(Long runId) {
		return jdbcTemplate.query("""
				SELECT run_id, id, role, content, answer_status, evidence_metric_ids,
					evidence_event_ids, evidence_news_ids, evidence_rag_chunk_ids, created_at
				FROM agent_messages
				WHERE run_id = ?
				ORDER BY created_at ASC, id ASC
				""", this::mapMessage, runId);
	}

	private List<AgentEvidenceItemDto> findEvidenceItems(Long runId) {
		return findEvidenceItems(runId, null);
	}

	private List<AgentEvidenceItemDto> findEvidenceItems(Long runId, Long messageId) {
		if (messageId != null) {
			return jdbcTemplate.query("""
					SELECT evidence_id, evidence_type, title, source_name, source_url, observed_at, snippet, payload
					FROM agent_evidence_items
					WHERE run_id = ? AND message_id = ?
					ORDER BY id ASC
					""", (resultSet, rowNumber) -> new AgentEvidenceItemDto(
					resultSet.getString("evidence_id"),
					resultSet.getString("evidence_type"),
					resultSet.getString("title"),
					resultSet.getString("source_name"),
					resultSet.getString("source_url"),
					resultSet.getString("observed_at"),
					resultSet.getString("snippet"),
					resultSet.getString("payload")), runId, messageId);
		}
		return jdbcTemplate.query("""
				SELECT evidence_id, evidence_type, title, source_name, source_url, observed_at, snippet, payload
				FROM agent_evidence_items
				WHERE run_id = ?
				ORDER BY id ASC
				""", (resultSet, rowNumber) -> new AgentEvidenceItemDto(
				resultSet.getString("evidence_id"),
				resultSet.getString("evidence_type"),
				resultSet.getString("title"),
				resultSet.getString("source_name"),
				resultSet.getString("source_url"),
				resultSet.getString("observed_at"),
				resultSet.getString("snippet"),
				resultSet.getString("payload")), runId);
	}

	private int stepCount(Long runId) {
		Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM agent_steps WHERE run_id = ?", Integer.class, runId);
		return count == null ? 0 : count;
	}

	private AgentRunSummary mapRun(ResultSet resultSet, int rowNumber) throws SQLException {
		return new AgentRunSummary(
				resultSet.getLong("id"),
				resultSet.getString("run_type"),
				resultSet.getString("status"),
				resultSet.getString("summary"),
				resultSet.getString("status_label"),
				resultSet.getString("korea_impact"),
				splitLines(resultSet.getString("risks")),
				splitComma(resultSet.getString("evidence_metric_ids")),
				splitComma(resultSet.getString("evidence_event_ids")),
				splitComma(resultSet.getString("evidence_news_ids")),
				splitComma(resultSet.getString("evidence_rag_chunk_ids")),
				resultSet.getString("model"),
				resultSet.getString("locale"),
				resultSet.getString("error_message"),
				timestamp(resultSet.getTimestamp("created_at")),
				timestamp(resultSet.getTimestamp("completed_at")));
	}

	private AgentMessageDto mapMessage(ResultSet resultSet, int rowNumber) throws SQLException {
		Long runId = resultSet.getLong("run_id");
		Long messageId = resultSet.getLong("id");
		return new AgentMessageDto(
				messageId,
				resultSet.getString("role"),
				resultSet.getString("content"),
				resultSet.getString("answer_status"),
				splitComma(resultSet.getString("evidence_metric_ids")),
				splitComma(resultSet.getString("evidence_event_ids")),
				splitComma(resultSet.getString("evidence_news_ids")),
				splitComma(resultSet.getString("evidence_rag_chunk_ids")),
				findEvidenceItems(runId, messageId),
				findSteps(runId, messageId),
				timestamp(resultSet.getTimestamp("created_at")));
	}

	private String timestamp(Timestamp timestamp) {
		return timestamp == null ? null : timestamp.toInstant().atOffset(ZoneOffset.UTC).toString();
	}

	private String joinComma(List<String> values) {
		return values == null ? "" : String.join(",", values);
	}

	private String joinLines(List<String> values) {
		return values == null ? "" : String.join("\n", values);
	}

	private List<String> splitComma(String value) {
		if (value == null || value.isBlank()) {
			return List.of();
		}
		return Arrays.stream(value.split(","))
				.map(String::trim)
				.filter(item -> !item.isBlank())
				.toList();
	}

	private List<String> splitLines(String value) {
		if (value == null || value.isBlank()) {
			return List.of();
		}
		return Arrays.stream(value.split("\\R"))
				.map(String::trim)
				.filter(item -> !item.isBlank())
				.toList();
	}

	private String nullToEmpty(String value) {
		return value == null ? "" : value;
	}

	private String localeTag(SupportedLocale locale) {
		return (locale == null ? SupportedLocale.KO : locale).tag();
	}

	private List<AgentEvidenceItemDto> emptyIfNull(List<AgentEvidenceItemDto> values) {
		return values == null ? List.of() : values;
	}
}
