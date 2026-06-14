package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.definition.EconomyMetricDefinitions;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AgentTraceStep;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AiBrief;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomyDashboard;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ExchangeRate;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.KoreaImpact;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.MarketSignal;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ReportItem;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.repository.EconomySnapshotRepository;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class EconomyDashboardService {

	private final EconomySnapshotRepository repository;
	private final EconomySyncService syncService;
	private final KoreaEximExchangeSyncService exchangeSyncService;
	private final EconomyTextCatalog textCatalog;

	public EconomyDashboardService(
			EconomySnapshotRepository repository,
			EconomySyncService syncService,
			KoreaEximExchangeSyncService exchangeSyncService,
			EconomyTextCatalog textCatalog) {
		this.repository = repository;
		this.syncService = syncService;
		this.exchangeSyncService = exchangeSyncService;
		this.textCatalog = textCatalog;
	}

	public EconomyDashboard dashboard() {
		return dashboard(SupportedLocale.KO);
	}

	public EconomyDashboard dashboard(SupportedLocale locale) {
		SupportedLocale resolvedLocale = locale == null ? SupportedLocale.KO : locale;
		List<EconomyMetricSnapshot> metrics = repository.findLatestMetrics().stream()
				.map(metric -> textCatalog.localizeMetric(metric, resolvedLocale))
				.toList();
		List<EconomicEvent> events = repository.findEvents().stream()
				.map(event -> textCatalog.localizeEvent(event, resolvedLocale))
				.toList();
		List<ExchangeRate> exchangeRates = repository.findExchangeRates();
		AiBrief brief = repository.findLatestBrief(resolvedLocale)
				.orElseGet(() -> RuleBasedBriefFactory.fallback(metrics, events, "fallback:no-openai-key", resolvedLocale));
		syncService.refreshIfStale();
		exchangeSyncService.refreshIfStale();

		return new EconomyDashboard(
				brief,
				metrics,
				exchangeRates,
				events,
				marketSignals(metrics, resolvedLocale),
				koreaImpacts(metrics, resolvedLocale),
				reports(metrics, resolvedLocale),
				agentTrace(metrics, resolvedLocale));
	}

	public List<ReportItem> reports(SupportedLocale locale, String category, String metricId) {
		SupportedLocale resolvedLocale = locale == null ? SupportedLocale.KO : locale;
		List<EconomyMetricSnapshot> metrics = repository.findLatestMetrics().stream()
				.map(metric -> textCatalog.localizeMetric(metric, resolvedLocale))
				.toList();
		return reports(metrics, resolvedLocale).stream()
				.filter(report -> category == null || category.isBlank() || category.equalsIgnoreCase(report.category()))
				.filter(report -> metricId == null || metricId.isBlank() || report.relatedMetricIds().contains(metricId))
				.toList();
	}

	private List<MarketSignal> marketSignals(List<EconomyMetricSnapshot> metrics, SupportedLocale locale) {
		Optional<EconomyMetricSnapshot> tenYear = metric(metrics, "ust10y");
		Optional<EconomyMetricSnapshot> fx = metric(metrics, "usd-krw");
		Optional<EconomyMetricSnapshot> oil = metric(metrics, "wti");
		return textCatalog.marketSignals(
				locale,
				tenYear.orElse(null),
				fx.orElse(null),
				oil.orElse(null),
				stateFromChange(tenYear),
				stateFromChange(fx),
				stateFromChange(oil));
	}

	private List<KoreaImpact> koreaImpacts(List<EconomyMetricSnapshot> metrics, SupportedLocale locale) {
		return textCatalog.koreaImpacts(
				locale,
				stateFromChange(metric(metrics, "usd-krw")),
				metric(metrics, "retail-sales").isPresent() ? "neutral" : "watch",
				stateFromChange(metric(metrics, "ust10y")));
	}

	private List<ReportItem> reports(List<EconomyMetricSnapshot> metrics, SupportedLocale locale) {
		return metrics.stream()
				.filter(metric -> hasText(metric.sourceUrl()))
				.sorted(Comparator.comparingInt(metric -> EconomyMetricDefinitions.orderOf(metric.id())))
				.limit(4)
				.map(metric -> textCatalog.reportFor(locale, metric))
				.toList();
	}

	private List<AgentTraceStep> agentTrace(List<EconomyMetricSnapshot> metrics, SupportedLocale locale) {
		String sourceResult = metrics.stream().allMatch(metric -> hasText(metric.sourceUrl())) ? "pass" : "review";
		return textCatalog.agentTrace(locale, sourceResult);
	}

	private Optional<EconomyMetricSnapshot> metric(List<EconomyMetricSnapshot> metrics, String id) {
		return metrics.stream().filter(metric -> id.equals(metric.id())).findFirst();
	}

	private String stateFromChange(Optional<EconomyMetricSnapshot> metric) {
		return metric
				.map(EconomyMetricSnapshot::change)
				.map(this::parseChange)
				.map(change -> change.abs().compareTo(BigDecimal.ZERO) == 0 ? "calm" : "watch")
				.orElse("neutral");
	}

	private BigDecimal parseChange(String change) {
		try {
			return new BigDecimal(change.replace("+", "").replace("%", ""));
		} catch (NumberFormatException exception) {
			return BigDecimal.ZERO;
		}
	}

	private boolean hasText(String value) {
		return value != null && !value.isBlank();
	}
}
