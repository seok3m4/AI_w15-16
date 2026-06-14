package com.junglecamp.backend.economy.controller;

import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomyDashboard;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.DataSourcesResponse;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.EventsResponse;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MarketIndicatorsResponse;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MetricHistoryResponse;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.ReportsResponse;
import com.junglecamp.backend.economy.service.EconomyDashboardService;
import com.junglecamp.backend.economy.service.EconomySupplementService;
import com.junglecamp.backend.i18n.LocaleResolver;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/us-economy")
public class UsEconomyDashboardController {

	private final EconomyDashboardService dashboardService;
	private final EconomySupplementService supplementService;
	private final LocaleResolver localeResolver;

	public UsEconomyDashboardController(
			EconomyDashboardService dashboardService,
			EconomySupplementService supplementService,
			LocaleResolver localeResolver) {
		this.dashboardService = dashboardService;
		this.supplementService = supplementService;
		this.localeResolver = localeResolver;
	}

	@GetMapping("/dashboard")
	public EconomyDashboard dashboard(
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return dashboardService.dashboard(localeResolver.resolve(locale, acceptLanguage));
	}

	@GetMapping("/metrics/{metricId}/history")
	public MetricHistoryResponse metricHistory(
			@PathVariable String metricId,
			@RequestParam(name = "range", defaultValue = "3y") String range,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return supplementService.history(metricId, range, localeResolver.resolve(locale, acceptLanguage));
	}

	@GetMapping("/data-sources")
	public DataSourcesResponse dataSources() {
		return supplementService.dataSources();
	}

	@GetMapping("/market-indicators")
	public MarketIndicatorsResponse marketIndicators(
			@RequestParam(name = "group", required = false) String group,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return supplementService.marketIndicators(group, localeResolver.resolve(locale, acceptLanguage));
	}

	@GetMapping("/events")
	public EventsResponse events(
			@RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			@RequestParam(name = "source", required = false) String source,
			@RequestParam(name = "importance", required = false) String importance,
			@RequestParam(name = "category", required = false) String category,
			@RequestParam(name = "relatedMetricId", required = false) String relatedMetricId,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return supplementService.events(
				from,
				to,
				source,
				importance,
				category,
				relatedMetricId,
				localeResolver.resolve(locale, acceptLanguage));
	}

	@GetMapping("/calendar")
	public EventsResponse calendar(
			@RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			@RequestParam(name = "source", required = false) String source,
			@RequestParam(name = "importance", required = false) String importance,
			@RequestParam(name = "category", required = false) String category,
			@RequestParam(name = "relatedMetricId", required = false) String relatedMetricId,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return supplementService.events(
				from,
				to,
				source,
				importance,
				category,
				relatedMetricId,
				localeResolver.resolve(locale, acceptLanguage));
	}

	@GetMapping("/reports")
	public ReportsResponse reports(
			@RequestParam(name = "category", required = false) String category,
			@RequestParam(name = "metricId", required = false) String metricId,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage) {
		return supplementService.reports(category, metricId, localeResolver.resolve(locale, acceptLanguage));
	}
}
