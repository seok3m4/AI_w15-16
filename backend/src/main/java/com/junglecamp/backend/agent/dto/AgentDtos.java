package com.junglecamp.backend.agent.dto;

import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomyDashboard;
import java.util.List;

public final class AgentDtos {

	private AgentDtos() {
	}

	public record AgentRunSummary(
			Long id,
			String runType,
			String status,
			String summary,
			String statusLabel,
			String koreaImpact,
			List<String> risks,
			List<String> evidenceMetricIds,
			List<String> evidenceEventIds,
			List<String> evidenceNewsIds,
			List<String> evidenceRagChunkIds,
			String model,
			String locale,
			String errorMessage,
			String createdAt,
			String completedAt) {
	}

	public record AgentRunDetail(
			AgentRunSummary run,
			List<AgentTraceStepDto> steps,
			List<AgentMessageDto> messages,
			List<AgentEvidenceItemDto> evidenceItems) {
	}

	public record AgentDefinition(
			String id,
			String name,
			String description,
			String focus) {
	}

	public record AgentEvidenceItemDto(
			String id,
			String type,
			String title,
			String sourceName,
			String sourceUrl,
			String observedAt,
			String snippet,
			String payload) {
	}

	public record AgentTraceStepDto(
			String agent,
			String action,
			String guardrail,
			String result) {
	}

	public record AgentMessageDto(
			Long id,
			String role,
			String content,
			String answerStatus,
			List<String> evidenceMetricIds,
			List<String> evidenceEventIds,
			List<String> evidenceNewsIds,
			List<String> evidenceRagChunkIds,
			List<AgentEvidenceItemDto> evidenceItems,
			List<AgentTraceStepDto> steps,
			String createdAt) {
	}

	public record AgentChatRequest(
			String message,
			String agentId,
			Long runId,
			String locale) {
	}

	public record AgentChatResponse(
			AgentMessageDto message,
			AgentRunDetail run) {
	}

	public record AgentWorkerBriefingRequest(
			EconomyDashboard dashboard,
			String model,
			String locale) {
	}

	public record AgentWorkerBriefingResponse(
			String summary,
			String statusLabel,
			String koreaImpact,
			List<String> risks,
			List<String> evidenceMetricIds,
			List<String> evidenceEventIds,
			List<String> evidenceNewsIds,
			List<String> evidenceRagChunkIds,
			List<AgentEvidenceItemDto> evidenceItems,
			List<AgentTraceStepDto> traceSteps) {
	}

	public record AgentWorkerChatRequest(
			AgentRunDetail run,
			String message,
			EconomyDashboard dashboard,
			String model,
			String toolPolicy,
			String agentId,
			String locale) {
	}

	public record AgentWorkerChatResponse(
			String answer,
			String answerStatus,
			List<String> evidenceMetricIds,
			List<String> evidenceEventIds,
			List<String> evidenceNewsIds,
			List<String> evidenceRagChunkIds,
			List<AgentEvidenceItemDto> evidenceItems,
			List<AgentTraceStepDto> traceSteps) {
	}
}
