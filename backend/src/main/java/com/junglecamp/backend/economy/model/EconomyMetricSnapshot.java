package com.junglecamp.backend.economy.model;
public record EconomyMetricSnapshot(
		String id,
		String seriesId,
		String name,
		String category,
		String value,
		String unit,
		String period,
		String baseDate,
		String sourceName,
		String sourceUrl,
		String previousValue,
		String change,
		String changePercent,
		String interpretation,
		String updatedAt) {
}
