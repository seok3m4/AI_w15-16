package com.junglecamp.backend.user.model;

import java.util.List;

public record DashboardPreferences(
		List<String> coreMetricIds,
		List<String> watchMetricIds,
		List<String> eventIds,
		List<String> reportIds,
		List<String> visibleSections) {

	public static final List<String> ALLOWED_VISIBLE_SECTIONS = List.of(
			"core-metrics",
			"economic-events",
			"reports",
			"watchlist");

	public DashboardPreferences {
		coreMetricIds = copyOrEmpty(coreMetricIds);
		watchMetricIds = copyOrEmpty(watchMetricIds);
		eventIds = copyOrEmpty(eventIds);
		reportIds = copyOrEmpty(reportIds);
		visibleSections = copyOrEmpty(visibleSections);
	}

	public static DashboardPreferences defaults() {
		return new DashboardPreferences(
				List.of(
						"cpi",
						"core-cpi",
						"pce",
						"unemployment",
						"nonfarm-payrolls",
						"retail-sales",
						"gdp-growth",
						"ust10y",
						"ust2y",
						"usd-krw",
						"sp500",
						"wti"),
				List.of("usd-krw", "ust10y", "ust2y", "cpi", "retail-sales"),
				List.of(),
				List.of(),
				ALLOWED_VISIBLE_SECTIONS);
	}

	private static List<String> copyOrEmpty(List<String> values) {
		return values == null ? List.of() : List.copyOf(values);
	}
}
