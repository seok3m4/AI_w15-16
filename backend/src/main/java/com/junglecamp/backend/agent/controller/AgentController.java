package com.junglecamp.backend.agent.controller;

import com.junglecamp.backend.agent.dto.AgentDtos;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentChatRequest;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentChatResponse;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentDefinition;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunDetail;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunSummary;
import com.junglecamp.backend.agent.service.AgentService;
import com.junglecamp.backend.i18n.LocaleResolver;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agents")
public class AgentController {

	private final AgentService agentService;
	private final LocaleResolver localeResolver;

	public AgentController(AgentService agentService, LocaleResolver localeResolver) {
		this.agentService = agentService;
		this.localeResolver = localeResolver;
	}

	@GetMapping("/runs")
	public List<AgentRunSummary> runs(
			Authentication authentication,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return agentService.runs(authentication, localeResolver.resolve(locale, acceptLanguage));
	}

	@GetMapping("/summary")
	public AgentRunDetail summary(
			Authentication authentication,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return agentService.summary(authentication, localeResolver.resolve(locale, acceptLanguage));
	}

	@PostMapping("/summary/refresh")
	public AgentRunDetail refreshSummary(
			Authentication authentication,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return agentService.refreshSummary(authentication, localeResolver.resolve(locale, acceptLanguage));
	}

	@GetMapping("/catalog")
	public List<AgentDefinition> catalog(
			Authentication authentication,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return agentService.catalog(authentication, localeResolver.resolve(locale, acceptLanguage));
	}

	@PostMapping("/runs/briefing")
	public AgentRunDetail createBriefingRun(
			Authentication authentication,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return agentService.createBriefingRun(authentication, localeResolver.resolve(locale, acceptLanguage));
	}

	@GetMapping("/runs/{runId}")
	public AgentRunDetail run(@PathVariable Long runId, Authentication authentication) {
		return agentService.detail(runId, authentication);
	}

	@DeleteMapping("/runs/{runId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void hideRun(@PathVariable Long runId, Authentication authentication) {
		agentService.hideRun(runId, authentication);
	}

	@PostMapping("/runs/{runId}/chat")
	public AgentChatResponse chat(
			@PathVariable Long runId,
			@RequestBody AgentChatRequest request,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage,
			Authentication authentication) {
		return agentService.chat(
				runId,
				request.message(),
				request.agentId(),
				authentication,
				resolveRequestLocale(request, locale, acceptLanguage));
	}

	@PostMapping("/chat")
	public AgentChatResponse chat(
			@RequestBody AgentChatRequest request,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage,
			Authentication authentication) {
		return agentService.chat(request, authentication, resolveRequestLocale(request, locale, acceptLanguage));
	}

	private SupportedLocale resolveRequestLocale(
			AgentChatRequest request,
			String locale,
			String acceptLanguage) {
		if (request != null && request.locale() != null && !request.locale().isBlank()) {
			return localeResolver.resolve(request.locale(), acceptLanguage);
		}
		return localeResolver.resolve(locale, acceptLanguage);
	}
}
