package com.junglecamp.backend.economy.dto;

import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import java.util.List;

public final class EconomyDashboardDtos {

	private EconomyDashboardDtos() {
	}

	public record EconomyDashboard(
			AiBrief brief,
			List<EconomyMetricSnapshot> metrics,
			List<ExchangeRate> exchangeRates,
			List<EconomicEvent> events,
			List<MarketSignal> marketSignals,
			List<KoreaImpact> koreaImpacts,
			List<ReportItem> reports,
			List<AgentTraceStep> agentTrace) {
	}

	public record AiBrief(
			String summary,
			String statusLabel,
			List<String> evidenceMetricIds,
			List<String> evidenceEventIds,
			String koreaImpact,
			List<String> risks,
			String generatedAt,
			String generationStatus) {
	}

	public record ExchangeRate(
			String currencyCode,
			String currencyName,
			String baseDate,
			String dealBaseRate,
			String ttb,
			String tts,
			String sourceName,
			String sourceUrl,
			String updatedAt) {
	}

	public record EconomicEvent(
			String id,
			String title,
			String releaseDateTime,
			String importance,
			String previousValue,
			String forecastValue,
			String actualValue,
			String unit,
			String status,
			String interpretation,
			String sourceName,
			String sourceUrl,
			List<String> relatedMetricIds,
			String sourceType,
			String sourceEventId,
			String eventCategory,
			String updatedAt,
			String forecastStatus,
			ForecastEstimate estimatedForecast) {
	}

	public record ForecastEstimate(
			String value,
			String unit,
			String status,
			String method,
			String confidence,
			String note) {
	}

	public record MarketSignal(
			String id,
			String label,
			String state,
			String value,
			String interpretation) {
	}

	public record KoreaImpact(
			String axis,
			String state,
			String summary,
			List<String> watchItems) {
	}

	public record ReportItem(
			String id,
			String title,
			String category,
			String summary,
			String koreaImplication,
			List<String> relatedMetricIds,
			String sourceName,
			String sourceUrl) {
	}

	public record AgentTraceStep(
			String agent,
			String action,
			String guardrail,
			String result) {
	}
}
