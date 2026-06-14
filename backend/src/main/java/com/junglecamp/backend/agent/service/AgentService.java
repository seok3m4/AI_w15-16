package com.junglecamp.backend.agent.service;

import com.junglecamp.backend.agent.client.AgentWorkerClient;
import com.junglecamp.backend.agent.dto.AgentDtos;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentChatRequest;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentChatResponse;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentDefinition;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentEvidenceItemDto;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentMessageDto;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunDetail;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunSummary;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentTraceStepDto;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerBriefingResponse;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerChatResponse;
import com.junglecamp.backend.agent.exception.AgentGuardrailException;
import com.junglecamp.backend.agent.repository.AgentRunRepository;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomyDashboard;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.service.EconomyDashboardService;
import com.junglecamp.backend.i18n.SupportedLocale;
import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.service.AppUserService;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AgentService {

	private static final String SUMMARY_RUN_TYPE = "summary";
	private static final String BRIEFING_RUN_TYPE = "briefing";
	private static final String DEFAULT_AGENT_ID = "beginner-explainer";
	private static final String CHAT_TOOL_POLICY = "DASHBOARD_RAG_STRICT_EVIDENCE";
	private static final String STRICT_EVIDENCE_MESSAGE = "검증 가능한 근거가 부족해 답변을 확정할 수 없습니다. Agent 탭에서 새 브리핑을 실행하거나 더 구체적인 지표/기간을 질문해 주세요.";
	private static final Set<String> KNOWN_AGENT_IDS = Set.of(
			DEFAULT_AGENT_ID,
			"korea-impact",
			"indicator-drilldown",
			"evidence-checker");
	private static final List<AgentDefinition> AGENT_CATALOG = List.of(
			new AgentDefinition(
					DEFAULT_AGENT_ID,
					"쉬운말 경제 해설 Agent",
					"경제 질문을 초보자가 이해하기 쉬운 표현으로 풀어 설명합니다.",
					"전문 용어를 쉬운 비유와 짧은 문장으로 바꿉니다."),
			new AgentDefinition(
					"korea-impact",
					"한국 영향 분석 Agent",
					"미국 경제 지표가 한국 환율, 수입물가, 증시에 줄 수 있는 영향을 설명합니다.",
					"한국 관점의 연결 고리만 근거 기반으로 정리합니다."),
			new AgentDefinition(
					"indicator-drilldown",
					"지표 깊이보기 Agent",
					"CPI, 고용, 금리 같은 개별 지표의 의미와 해석 포인트를 설명합니다.",
					"지표 정의, 최근 값, 이전치, 변화 방향을 중심으로 답합니다."),
			new AgentDefinition(
					"evidence-checker",
					"근거 확인 Agent",
					"답변에 쓰인 지표와 RAG 근거가 실제 출처를 갖는지 확인합니다.",
					"근거가 부족하면 부족하다고 말하고 추가 확인 대상을 제안합니다."));
	private static final List<AgentDefinition> AGENT_CATALOG_EN = List.of(
			new AgentDefinition(
					DEFAULT_AGENT_ID,
					"Plain-language Economy Explainer",
					"Explains economic questions in beginner-friendly language.",
					"Turns technical terms into short beginner-friendly explanations."),
			new AgentDefinition(
					"korea-impact",
					"Korea Impact Analyst",
					"Explains how U.S. indicators can affect Korean FX, import prices, and stocks.",
					"Summarizes only evidence-based links from Korea's perspective."),
			new AgentDefinition(
					"indicator-drilldown",
					"Indicator Drilldown Agent",
					"Explains the meaning and interpretation points of indicators such as CPI, labor, and rates.",
					"Focuses on definition, latest value, previous value, and direction of change."),
			new AgentDefinition(
					"evidence-checker",
					"Evidence Checker Agent",
					"Checks whether metrics and RAG evidence used in an answer have real sources.",
					"States when evidence is insufficient and suggests what to verify next."));

	private final AppUserService appUserService;
	private final EconomyDashboardService dashboardService;
	private final AgentWorkerClient workerClient;
	private final AgentRunRepository repository;
	private final String model;
	private final boolean enabled;

	public AgentService(
			AppUserService appUserService,
			EconomyDashboardService dashboardService,
			AgentWorkerClient workerClient,
			AgentRunRepository repository,
			@Value("${app.agents.model:gpt-5.5}") String model,
			@Value("${app.agents.enabled:true}") boolean enabled) {
		this.appUserService = appUserService;
		this.dashboardService = dashboardService;
		this.workerClient = workerClient;
		this.repository = repository;
		this.model = model;
		this.enabled = enabled;
	}

	public List<AgentRunSummary> runs(Authentication authentication) {
		return runs(authentication, SupportedLocale.KO);
	}

	public List<AgentRunSummary> runs(Authentication authentication, SupportedLocale locale) {
		AppUser user = appUserService.currentUser(authentication);
		return repository.findRunsForUser(user.id(), resolveLocale(locale));
	}

	public AgentRunDetail detail(Long runId, Authentication authentication) {
		AppUser user = appUserService.currentUser(authentication);
		return repository.findDetailForUser(runId, user.id())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent run not found"));
	}

	public void hideRun(Long runId, Authentication authentication) {
		AppUser user = appUserService.currentUser(authentication);
		if (!repository.hideRunForUser(runId, user.id())) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent run not found");
		}
	}

	public AgentRunDetail summary(Authentication authentication) {
		return summary(authentication, SupportedLocale.KO);
	}

	public AgentRunDetail summary(Authentication authentication, SupportedLocale locale) {
		AppUser user = appUserService.currentUser(authentication);
		SupportedLocale resolvedLocale = resolveLocale(locale);
		return repository.findLatestDetailForUserByType(user.id(), SUMMARY_RUN_TYPE, resolvedLocale)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent summary not found"));
	}

	public AgentRunDetail refreshSummary(Authentication authentication) {
		return refreshSummary(authentication, SupportedLocale.KO);
	}

	public AgentRunDetail refreshSummary(Authentication authentication, SupportedLocale locale) {
		AppUser user = appUserService.currentUser(authentication);
		return createAgentRun(user, SUMMARY_RUN_TYPE, resolveLocale(locale));
	}

	public List<AgentDefinition> catalog(Authentication authentication) {
		return catalog(authentication, SupportedLocale.KO);
	}

	public List<AgentDefinition> catalog(Authentication authentication, SupportedLocale locale) {
		appUserService.currentUser(authentication);
		return agentCatalog(resolveLocale(locale));
	}

	public AgentRunDetail createBriefingRun(Authentication authentication) {
		return createBriefingRun(authentication, SupportedLocale.KO);
	}

	public AgentRunDetail createBriefingRun(Authentication authentication, SupportedLocale locale) {
		AppUser user = appUserService.currentUser(authentication);
		return createAgentRun(user, BRIEFING_RUN_TYPE, resolveLocale(locale));
	}

	private AgentRunDetail createAgentRun(AppUser user, String runType) {
		return createAgentRun(user, runType, SupportedLocale.KO);
	}

	private AgentRunDetail createAgentRun(AppUser user, String runType, SupportedLocale locale) {
		SupportedLocale resolvedLocale = resolveLocale(locale);
		EconomyDashboard dashboard = dashboardService.dashboard(resolvedLocale);
		Long runId = repository.createRun(user.id(), model, runType, resolvedLocale);

		try {
			AgentWorkerBriefingResponse response = enabled
					? workerClient.createBriefing(dashboard, resolvedLocale.tag())
					: fallbackBriefing(dashboard, "Agent worker is disabled.", resolvedLocale);
			validateEvidence(dashboard, response);
			repository.completeRun(runId, response, enabled ? "completed" : "fallback", null);
			repository.saveEvidenceItems(runId, response.evidenceItems());
			repository.saveSteps(runId, safeSteps(response.traceSteps(), "pass"));
			repository.appendMessage(runId, "assistant", response.summary());
		} catch (AgentGuardrailException exception) {
			AgentWorkerBriefingResponse failed = fallbackBriefing(dashboard, exception.getMessage(), resolvedLocale);
			repository.completeRun(runId, failed, "failed", exception.getMessage());
			repository.saveEvidenceItems(runId, failed.evidenceItems());
			repository.saveSteps(runId, List.of(new AgentTraceStepDto(
					"briefing-manager",
					"Validate agent evidence before saving output.",
					"no-unsourced-evidence",
					"failed")));
			repository.appendMessage(runId, "assistant", failed.summary());
		} catch (Exception exception) {
			AgentWorkerBriefingResponse fallback = fallbackBriefing(dashboard, exception.getMessage(), resolvedLocale);
			repository.completeRun(runId, fallback, "fallback", exception.getMessage());
			repository.saveEvidenceItems(runId, fallback.evidenceItems());
			repository.saveSteps(runId, List.of(new AgentTraceStepDto(
					"briefing-manager",
					"Use cached dashboard data when the Python worker is unavailable.",
					"worker-availability",
					"fallback")));
			repository.appendMessage(runId, "assistant", fallback.summary());
		}

		return detailForUser(runId, user);
	}

	public AgentChatResponse chat(Long runId, String message, Authentication authentication) {
		return chat(runId, message, DEFAULT_AGENT_ID, authentication, SupportedLocale.KO);
	}

	public AgentChatResponse chat(AgentChatRequest request, Authentication authentication) {
		return chat(request, authentication, SupportedLocale.KO);
	}

	public AgentChatResponse chat(AgentChatRequest request, Authentication authentication, SupportedLocale locale) {
		SupportedLocale resolvedLocale = resolveLocale(locale);
		String message = request == null ? null : request.message();
		String agentId = normalizeAgentId(request == null ? null : request.agentId());
		AppUser user = appUserService.currentUser(authentication);
		if (request == null || request.runId() == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent runId is required");
		}
		AgentRunDetail currentRun = repository.findDetailForUser(request.runId(), user.id())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent run not found"));
		return chat(currentRun, user, message, agentId, resolvedLocale);
	}

	public AgentChatResponse chat(
			Long runId,
			String message,
			String agentId,
			Authentication authentication,
			SupportedLocale locale) {
		AppUser user = appUserService.currentUser(authentication);
		AgentRunDetail currentRun = repository.findDetailForUser(runId, user.id())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent run not found"));
		return chat(currentRun, user, message, normalizeAgentId(agentId), resolveLocale(locale));
	}

	private AgentChatResponse chat(
			AgentRunDetail currentRun,
			AppUser user,
			String message,
			String agentId,
			SupportedLocale locale) {
		if (message == null || message.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Agent chat message must not be blank");
		}

		SupportedLocale resolvedLocale = resolveLocale(locale);
		ensureKnownAgent(agentId);
		EconomyDashboard dashboard = dashboardService.dashboard(resolvedLocale);
		Long runId = currentRun.run().id();
		repository.appendMessage(runId, "user", message.trim());

		AgentMessageDto assistantMessage;
		try {
			AgentWorkerChatResponse response = enabled
					? workerClient.chat(currentRun, message.trim(), dashboard, CHAT_TOOL_POLICY, agentId, resolvedLocale.tag())
					: fallbackChat("Agent worker is disabled.", agentId, resolvedLocale);
			response = enforceStrictChatEvidence(response, resolvedLocale);
			validateEvidence(dashboard, response);
			assistantMessage = repository.appendAssistantMessage(runId, response);
			repository.saveEvidenceItems(runId, assistantMessage.id(), response.evidenceItems());
			repository.saveSteps(runId, assistantMessage.id(), safeSteps(response.traceSteps(), "pass", agentId));
		} catch (Exception exception) {
			AgentWorkerChatResponse fallback = fallbackChat(
					"Please use the saved briefing evidence and try again later.",
					agentId,
					resolvedLocale);
			assistantMessage = repository.appendAssistantMessage(runId, fallback);
			repository.saveSteps(runId, assistantMessage.id(), safeSteps(fallback.traceSteps(), "fallback", agentId));
		}

		AgentRunDetail updatedRun = detailForUser(runId, user);
		return new AgentChatResponse(findMessage(updatedRun, assistantMessage.id()), updatedRun);
	}

	private String normalizeAgentId(String agentId) {
		return hasText(agentId) ? agentId.trim() : DEFAULT_AGENT_ID;
	}

	private void ensureKnownAgent(String agentId) {
		if (!KNOWN_AGENT_IDS.contains(agentId)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown agentId: " + agentId);
		}
	}

	private AgentRunDetail detailForUser(Long runId, AppUser user) {
		return repository.findDetailForUser(runId, user.id())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent run not found"));
	}

	private AgentWorkerBriefingResponse fallbackBriefing(EconomyDashboard dashboard, String reason) {
		return fallbackBriefing(dashboard, reason, SupportedLocale.KO);
	}

	private AgentWorkerBriefingResponse fallbackBriefing(
			EconomyDashboard dashboard,
			String reason,
			SupportedLocale locale) {
		SupportedLocale resolvedLocale = resolveLocale(locale);
		return new AgentWorkerBriefingResponse(
				dashboard.brief().summary(),
				dashboard.brief().statusLabel(),
				dashboard.brief().koreaImpact(),
				dashboard.brief().risks().isEmpty()
						? List.of(fallbackRisk(resolvedLocale, reason))
						: dashboard.brief().risks(),
				validMetricEvidenceIds(dashboard, dashboard.brief().evidenceMetricIds()),
				validEventEvidenceIds(dashboard, dashboard.brief().evidenceEventIds()),
				List.of(),
				List.of(),
				List.of(),
				List.of(new AgentTraceStepDto(
						"briefing-manager",
						text(resolvedLocale,
								"검증된 대시보드 요약을 재사용합니다.",
								"Reuse verified dashboard brief.",
								"复用已验证的仪表盘摘要。",
								"重用已驗證的儀表板摘要。",
								"検証済みのダッシュボード要約を再利用します。"),
						"fallback-boundary",
						"fallback")));
	}

	private AgentWorkerChatResponse fallbackChat(String reason, String agentId) {
		return fallbackChat(reason, agentId, SupportedLocale.KO);
	}

	private AgentWorkerChatResponse fallbackChat(String reason, String agentId, SupportedLocale locale) {
		SupportedLocale resolvedLocale = resolveLocale(locale);
		return new AgentWorkerChatResponse(
				fallbackChatAnswer(resolvedLocale, reason),
				"fallback",
				List.of(),
				List.of(),
				List.of(),
				List.of(),
				List.of(),
				List.of(new AgentTraceStepDto(
						agentId,
						text(resolvedLocale,
								"저장된 브리핑 근거를 재사용합니다.",
								"Reuse saved briefing evidence.",
								"复用已保存的简报依据。",
								"重用已儲存的簡報依據。",
								"保存済みのブリーフィング根拠を再利用します。"),
						"chat-fallback",
						"fallback")));
	}

	private List<AgentTraceStepDto> safeSteps(List<AgentTraceStepDto> steps, String result) {
		return safeSteps(steps, result, "briefing-manager");
	}

	private List<AgentTraceStepDto> safeSteps(List<AgentTraceStepDto> steps, String result, String agent) {
		if (steps == null || steps.isEmpty()) {
			return List.of(new AgentTraceStepDto(agent, "Run agent workflow.", "structured-output", result));
		}
		return steps;
	}

	private AgentMessageDto findMessage(AgentRunDetail run, Long messageId) {
		return run.messages().stream()
				.filter(message -> message.id().equals(messageId))
				.findFirst()
				.orElseThrow(() -> new IllegalStateException("Saved agent message was not found"));
	}

	private AgentWorkerChatResponse enforceStrictChatEvidence(AgentWorkerChatResponse response, SupportedLocale locale) {
		String status = hasText(response.answerStatus()) ? response.answerStatus() : "answered";
		if (!"answered".equals(status)) {
			return new AgentWorkerChatResponse(
					response.answer(),
					status,
					emptyIfNull(response.evidenceMetricIds()),
					emptyIfNull(response.evidenceEventIds()),
					emptyIfNull(response.evidenceNewsIds()),
					emptyIfNull(response.evidenceRagChunkIds()),
					response.evidenceItems() == null ? List.of() : response.evidenceItems(),
					response.traceSteps() == null ? List.of() : response.traceSteps());
		}
		if (hasEvidence(response)) {
			return new AgentWorkerChatResponse(
					response.answer(),
					status,
					emptyIfNull(response.evidenceMetricIds()),
					emptyIfNull(response.evidenceEventIds()),
					emptyIfNull(response.evidenceNewsIds()),
					emptyIfNull(response.evidenceRagChunkIds()),
					response.evidenceItems() == null ? List.of() : response.evidenceItems(),
					response.traceSteps() == null ? List.of() : response.traceSteps());
		}

		List<AgentTraceStepDto> steps = new ArrayList<>();
		steps.add(new AgentTraceStepDto(
				"analysis-chat",
				"Refuse to finalize an economic answer without verified evidence.",
				"strict-evidence-required",
				"insufficient_evidence"));
		if (response.traceSteps() != null) {
			steps.addAll(response.traceSteps());
		}
		return new AgentWorkerChatResponse(
				strictEvidenceMessage(resolveLocale(locale)),
				"insufficient_evidence",
				List.of(),
				List.of(),
				List.of(),
				List.of(),
				List.of(),
				steps);
	}

	private boolean hasEvidence(AgentWorkerChatResponse response) {
		return !emptyIfNull(response.evidenceMetricIds()).isEmpty()
				|| !emptyIfNull(response.evidenceEventIds()).isEmpty()
				|| !emptyIfNull(response.evidenceNewsIds()).isEmpty()
				|| !emptyIfNull(response.evidenceRagChunkIds()).isEmpty();
	}

	private void validateEvidence(EconomyDashboard dashboard, AgentWorkerBriefingResponse response) {
		validateEvidence(
				dashboard,
				response.evidenceMetricIds(),
				response.evidenceEventIds(),
				response.evidenceNewsIds(),
				response.evidenceRagChunkIds(),
				response.evidenceItems());
	}

	private void validateEvidence(EconomyDashboard dashboard, AgentWorkerChatResponse response) {
		validateEvidence(
				dashboard,
				response.evidenceMetricIds(),
				response.evidenceEventIds(),
				response.evidenceNewsIds(),
				response.evidenceRagChunkIds(),
				response.evidenceItems());
	}

	private void validateEvidence(
			EconomyDashboard dashboard,
			List<String> metricIds,
			List<String> eventIds,
			List<String> newsIds,
			List<String> ragChunkIds,
			List<AgentEvidenceItemDto> evidenceItems) {
		Set<String> allowedMetricIds = sourcedMetricIds(dashboard);
		for (String metricId : emptyIfNull(metricIds)) {
			if (!allowedMetricIds.contains(metricId)) {
				throw new AgentGuardrailException("Agent cited an unknown or unsourced metric: " + metricId);
			}
		}

		Set<String> allowedEventIds = sourcedEventIds(dashboard);
		for (String eventId : emptyIfNull(eventIds)) {
			if (!allowedEventIds.contains(eventId)) {
				throw new AgentGuardrailException("Agent cited an unknown or unsourced event: " + eventId);
			}
		}

		Set<String> allowedNewsIds = sourcedEvidenceIds(evidenceItems, "news");
		for (String newsId : emptyIfNull(newsIds)) {
			if (!allowedNewsIds.contains(newsId)) {
				throw new AgentGuardrailException("Agent cited an unknown or unsourced news item: " + newsId);
			}
		}

		Set<String> allowedRagIds = sourcedEvidenceIds(evidenceItems, "rag");
		for (String ragChunkId : emptyIfNull(ragChunkIds)) {
			if (!allowedRagIds.contains(ragChunkId)) {
				throw new AgentGuardrailException("Agent cited an unknown or unsourced RAG chunk: " + ragChunkId);
			}
		}
	}

	private List<String> validMetricEvidenceIds(EconomyDashboard dashboard, List<String> metricIds) {
		Set<String> allowed = sourcedMetricIds(dashboard);
		return emptyIfNull(metricIds).stream().filter(allowed::contains).toList();
	}

	private List<String> validEventEvidenceIds(EconomyDashboard dashboard, List<String> eventIds) {
		Set<String> allowed = sourcedEventIds(dashboard);
		return emptyIfNull(eventIds).stream().filter(allowed::contains).toList();
	}

	private Set<String> sourcedMetricIds(EconomyDashboard dashboard) {
		Set<String> ids = new LinkedHashSet<>();
		for (EconomyMetricSnapshot metric : dashboard.metrics()) {
			if (hasText(metric.sourceUrl())) {
				ids.add(metric.id());
			}
		}
		return ids;
	}

	private Set<String> sourcedEventIds(EconomyDashboard dashboard) {
		Set<String> ids = new LinkedHashSet<>();
		for (EconomicEvent event : dashboard.events()) {
			if (hasText(event.sourceUrl())) {
				ids.add(event.id());
			}
		}
		return ids;
	}

	private List<String> emptyIfNull(List<String> values) {
		return values == null ? List.of() : values;
	}

	private Set<String> sourcedEvidenceIds(List<AgentEvidenceItemDto> items, String type) {
		Set<String> ids = new LinkedHashSet<>();
		for (AgentEvidenceItemDto item : items == null ? List.<AgentEvidenceItemDto>of() : items) {
			if (type.equals(item.type()) && hasText(item.id()) && hasText(item.sourceUrl())) {
				ids.add(item.id());
			}
		}
		return ids;
	}

	private List<AgentDefinition> agentCatalog(SupportedLocale locale) {
		return switch (resolveLocale(locale)) {
			case EN -> AGENT_CATALOG_EN;
			case ZH_HANS -> List.of(
					new AgentDefinition(
							DEFAULT_AGENT_ID,
							"简单经济解释 Agent",
							"用初学者容易理解的语言解释经济问题。",
							"把专业术语改写成短句和生活化表达。"),
					new AgentDefinition(
							"korea-impact",
							"韩国影响分析 Agent",
							"解释美国指标可能如何影响韩国汇率、进口物价和股市。",
							"只整理有依据的韩国视角连接点。"),
					new AgentDefinition(
							"indicator-drilldown",
							"指标深度解读 Agent",
							"解释 CPI、就业、利率等单个指标的含义和解读重点。",
							"围绕定义、最新值、前值和变化方向回答。"),
					new AgentDefinition(
							"evidence-checker",
							"依据检查 Agent",
							"检查回答使用的指标和 RAG 依据是否有真实来源。",
							"依据不足时会说明不足，并提出需要补充验证的内容。"));
			case ZH_HANT -> List.of(
					new AgentDefinition(
							DEFAULT_AGENT_ID,
							"簡明經濟解說 Agent",
							"用初學者容易理解的語言解釋經濟問題。",
							"把專業術語改寫成短句和生活化表達。"),
					new AgentDefinition(
							"korea-impact",
							"韓國影響分析 Agent",
							"解釋美國指標可能如何影響韓國匯率、進口物價和股市。",
							"只整理有依據的韓國視角連結點。"),
					new AgentDefinition(
							"indicator-drilldown",
							"指標深入解讀 Agent",
							"解釋 CPI、就業、利率等單一指標的含義和解讀重點。",
							"圍繞定義、最新值、前值和變化方向回答。"),
					new AgentDefinition(
							"evidence-checker",
							"依據檢查 Agent",
							"檢查回答使用的指標和 RAG 依據是否有真實來源。",
							"依據不足時會說明不足，並提出需要補充驗證的內容。"));
			case JA -> List.of(
					new AgentDefinition(
							DEFAULT_AGENT_ID,
							"やさしい経済解説 Agent",
							"経済の質問を初心者にもわかりやすい言葉で説明します。",
							"専門用語を短い文と身近なたとえに置き換えます。"),
					new AgentDefinition(
							"korea-impact",
							"韓国影響分析 Agent",
							"米国指標が韓国の為替、輸入物価、株式市場に与えうる影響を説明します。",
							"韓国視点のつながりだけを根拠ベースで整理します。"),
					new AgentDefinition(
							"indicator-drilldown",
							"指標深掘り Agent",
							"CPI、雇用、金利など個別指標の意味と見方を説明します。",
							"定義、最新値、前回値、変化方向を中心に答えます。"),
					new AgentDefinition(
							"evidence-checker",
							"根拠確認 Agent",
							"回答に使われた指標と RAG 根拠に実際の出典があるか確認します。",
							"根拠が不足する場合は不足していると言い、追加確認対象を提案します。"));
			case KO -> AGENT_CATALOG;
		};
	}

	private String strictEvidenceMessage(SupportedLocale locale) {
		return text(
				locale,
				"검증 가능한 근거가 부족해 답변을 확정할 수 없습니다. Agent 탭에서 새 브리핑을 실행하거나 더 구체적인 지표/기간을 질문해 주세요.",
				"There is not enough verified evidence to finalize an answer. Run a new briefing in the Agent tab or ask about a more specific indicator or period.",
				"可验证依据不足，无法确定回答。请在 Agent 标签重新生成简报，或询问更具体的指标或期间。",
				"可驗證依據不足，無法確定回答。請在 Agent 分頁重新產生簡報，或詢問更具體的指標或期間。",
				"検証できる根拠が不足しているため、回答を確定できません。Agent タブで新しいブリーフィングを実行するか、より具体的な指標や期間を質問してください。");
	}

	private String fallbackRisk(SupportedLocale locale, String reason) {
		if (hasText(reason)) {
			return reason;
		}
		return text(
				locale,
				"Agent 대체 응답이 사용되었습니다.",
				"Agent fallback response was used.",
				"已使用 Agent 备用回答。",
				"已使用 Agent 備用回答。",
				"Agent の代替応答を使用しました。");
	}

	private String fallbackChatAnswer(SupportedLocale locale, String reason) {
		String detail = hasText(reason) ? reason : fallbackRisk(locale, null);
		return switch (resolveLocale(locale)) {
			case KO -> "Agent chat을 사용할 수 없습니다. " + detail;
			case EN -> "Agent chat is unavailable: " + detail;
			case ZH_HANS -> "Agent 聊天暂时不可用：" + detail;
			case ZH_HANT -> "Agent 聊天暫時不可用：" + detail;
			case JA -> "Agent チャットは現在利用できません: " + detail;
		};
	}

	private SupportedLocale resolveLocale(SupportedLocale locale) {
		return locale == null ? SupportedLocale.KO : locale;
	}

	private String text(
			SupportedLocale locale,
			String ko,
			String en,
			String zhHans,
			String zhHant,
			String ja) {
		return switch (resolveLocale(locale)) {
			case KO -> ko;
			case EN -> en;
			case ZH_HANS -> zhHans;
			case ZH_HANT -> zhHant;
			case JA -> ja;
		};
	}

	private boolean hasText(String value) {
		return value != null && !value.isBlank();
	}
}
