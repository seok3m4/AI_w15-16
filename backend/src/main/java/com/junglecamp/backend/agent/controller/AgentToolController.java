package com.junglecamp.backend.agent.controller;

import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomyDashboard;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ReportItem;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.service.EconomyDashboardService;
import com.junglecamp.backend.rag.dto.RagDtos;
import com.junglecamp.backend.rag.dto.RagDtos.RagSearchResponse;
import com.junglecamp.backend.rag.service.RagIndexService;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/internal/agent-tools")
public class AgentToolController {

	private final EconomyDashboardService dashboardService;
	private final RagIndexService ragIndexService;
	private final String workerToken;

	public AgentToolController(
			EconomyDashboardService dashboardService,
			RagIndexService ragIndexService,
			@Value("${app.agents.worker-token:local-agent-token}") String workerToken) {
		this.dashboardService = dashboardService;
		this.ragIndexService = ragIndexService;
		this.workerToken = workerToken;
	}

	@GetMapping("/indicators")
	public IndicatorSearchResponse indicators(
			@RequestHeader(name = "X-Agent-Worker-Token", required = false) String token,
			@RequestParam String query,
			@RequestParam(required = false) String category,
			@RequestParam(defaultValue = "5") int limit) {
		verifyToken(token);
		EconomyDashboard dashboard = dashboardService.dashboard();
		String normalizedQuery = normalize(query);
		String normalizedCategory = normalize(category);
		List<IndicatorSearchResult> results = dashboard.metrics()
				.stream()
				.filter(metric -> normalizedCategory == null || normalize(metric.category()).equals(normalizedCategory))
				.filter(metric -> contains(metric.id(), normalizedQuery)
						|| contains(metric.seriesId(), normalizedQuery)
						|| contains(metric.name(), normalizedQuery)
						|| contains(metric.category(), normalizedQuery)
						|| contains(metric.interpretation(), normalizedQuery)
						|| contains(metricAliases(metric), normalizedQuery))
				.limit(safeLimit(limit))
				.map(metric -> new IndicatorSearchResult(
						metric.id(),
						"metric",
						metric.name(),
						metric.category(),
						metric.sourceName(),
						metric.sourceUrl(),
						metric.interpretation()))
				.toList();
		return new IndicatorSearchResponse(results);
	}

	@GetMapping("/fred-snapshot")
	public FredSnapshotResponse fredSnapshot(
			@RequestHeader(name = "X-Agent-Worker-Token", required = false) String token,
			@RequestParam(required = false) List<String> metricIds,
			@RequestParam(required = false) List<String> seriesIds,
			@RequestParam(defaultValue = "5") int limit) {
		verifyToken(token);
		EconomyDashboard dashboard = dashboardService.dashboard();
		List<EconomyMetricSnapshot> results = dashboard.metrics()
				.stream()
				.filter(metric -> metricIds == null || metricIds.isEmpty() || metricIds.contains(metric.id()))
				.filter(metric -> seriesIds == null || seriesIds.isEmpty() || seriesIds.contains(metric.seriesId()))
				.limit(safeLimit(limit))
				.toList();
		return new FredSnapshotResponse(results);
	}

	@GetMapping("/dashboard-catalog")
	public DashboardCatalogResponse dashboardCatalog(
			@RequestHeader(name = "X-Agent-Worker-Token", required = false) String token) {
		verifyToken(token);
		EconomyDashboard dashboard = dashboardService.dashboard();
		return new DashboardCatalogResponse(dashboard.metrics(), dashboard.events(), dashboard.reports());
	}

	@GetMapping("/rag-search")
	public RagSearchResponse ragSearch(
			@RequestHeader(name = "X-Agent-Worker-Token", required = false) String token,
			@RequestParam String query,
			@RequestParam(required = false) List<String> sourceTypes,
			@RequestParam(defaultValue = "5") int limit) {
		verifyToken(token);
		return ragIndexService.search(query, sourceTypes, limit);
	}

	private void verifyToken(String token) {
		if (workerToken == null || workerToken.isBlank() || !workerToken.equals(token)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid agent worker token");
		}
	}

	private int safeLimit(int limit) {
		return Math.max(1, Math.min(limit, 10));
	}

	private boolean contains(String value, String query) {
		if (query == null) {
			return true;
		}
		return value != null && value.toLowerCase(Locale.ROOT).contains(query);
	}

	private String normalize(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim().toLowerCase(Locale.ROOT);
	}

	private String metricAliases(EconomyMetricSnapshot metric) {
		String id = normalize(metric.id());
		String seriesId = normalize(metric.seriesId());
		if ("cpi".equals(id) || "cpiaucsl".equals(seriesId)) {
			return "inflation prices consumer price";
		}
		if ("unemployment".equals(id) || "unrate".equals(seriesId)) {
			return "jobs labor unemployment employment";
		}
		if ("usd-krw".equals(id)) {
			return "fx exchange rate dollar won";
		}
		return "";
	}

	public record IndicatorSearchResponse(List<IndicatorSearchResult> results) {
	}

	public record IndicatorSearchResult(
			String id,
			String type,
			String title,
			String category,
			String sourceName,
			String sourceUrl,
			String snippet) {
	}

	public record FredSnapshotResponse(List<EconomyMetricSnapshot> results) {
	}

	public record DashboardCatalogResponse(
			List<EconomyMetricSnapshot> metrics,
			List<EconomicEvent> events,
			List<ReportItem> reports) {
	}
}
