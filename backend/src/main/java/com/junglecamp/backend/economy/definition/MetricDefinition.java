package com.junglecamp.backend.economy.definition;
public record MetricDefinition(
		String id,
		String seriesId,
		String name,
		String category,
		String unit,
		String fredUnits,
		int decimals,
		String frequency,
		String interpretation) {

	public String sourceUrl() {
		return "https://fred.stlouisfed.org/series/" + seriesId;
	}
}
