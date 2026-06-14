package com.junglecamp.backend.economy.dto;

import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ReportItem;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import java.util.List;

public final class EconomySupplementDtos {

	private EconomySupplementDtos() {
	}

	public record MetricHistoryResponse(
			EconomyMetricSnapshot metric,
			List<MetricObservationPoint> points,
			List<MetricSourceComparison> sourceComparisons,
			String syncStatus,
			List<DataSourceInfo> dataSources,
			AssetImpact assetImpact,
			List<EconomicEvent> relatedEvents) {
	}

	public record MetricObservationPoint(
			String date,
			String value) {
	}

	public record MetricSourceComparison(
			String provider,
			String providerSeriesId,
			String value,
			String unit,
			String rawValue,
			String rawUnit,
			String normalizedValue,
			String normalizedUnit,
			String comparisonNote,
			String baseDate,
			String sourceUrl,
			String status,
			String errorMessage,
			String updatedAt) {
	}

	public record EventsResponse(List<EconomicEvent> items) {
	}

	public record ReportsResponse(List<ReportItem> items) {
	}

	public record DataSourcesResponse(List<DataSourceInfo> items) {
	}

	public record DataSourceInfo(
			String id,
			String name,
			String providerType,
			String usedFor,
			String coverage,
			String updateFrequency,
			boolean apiKeyRequired,
			String sourceUrl,
			String status) {
	}

	public record AssetImpact(
			String stocks,
			String bonds,
			String gold,
			String dollar,
			String note) {
	}

	public record MarketIndicatorsResponse(List<MarketIndicator> items) {
	}

	public record MarketIndicator(
			String id,
			String name,
			String group,
			String value,
			String unit,
			String baseDate,
			String sourceName,
			String sourceUrl,
			String change,
			String status) {
	}
}
