package com.junglecamp.backend.economy;

import com.junglecamp.backend.economy.definition.EconomyMetricDefinitions;
import com.junglecamp.backend.economy.definition.MetricDefinition;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.mapper.FredObservationMapper;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.model.FredObservation;
import com.junglecamp.backend.economy.service.RuleBasedBriefFactory;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FredObservationMapperTests {

	private final FredObservationMapper mapper = new FredObservationMapper();

	@Test
	void calculatesLatestPreviousAndPercentChangeFromFredObservations() {
		MetricDefinition definition = EconomyMetricDefinitions.byId("cpi").orElseThrow();

		EconomyMetricSnapshot snapshot = mapper.toSnapshot(definition, List.of(
				new FredObservation("2026-04-01", "3.0"),
				new FredObservation("2026-05-01", "3.1")));

		assertEquals("cpi", snapshot.id());
		assertEquals("CPIAUCSL", snapshot.seriesId());
		assertEquals("CPI", snapshot.name());
		assertEquals("3.1", snapshot.value());
		assertEquals("3.0", snapshot.previousValue());
		assertEquals("+0.1", snapshot.change());
		assertEquals("+3.3%", snapshot.changePercent());
		assertEquals("2026-05", snapshot.baseDate());
		assertEquals("https://fred.stlouisfed.org/series/CPIAUCSL", snapshot.sourceUrl());
	}

	@Test
	void excludesMetricsWithoutSourcesFromAiBriefEvidence() {
		EconomyMetricSnapshot sourced = new EconomyMetricSnapshot(
				"cpi",
				"CPIAUCSL",
				"CPI",
				"Prices",
				"3.1",
				"% YoY",
				"2026-05",
				"2026-05",
				"FRED",
				"https://fred.stlouisfed.org/series/CPIAUCSL",
				"3.0",
				"+0.1",
				"+3.3%",
				"Inflation remains sticky.",
				"2026-06-12T09:00:00+09:00");
		EconomyMetricSnapshot unsourced = new EconomyMetricSnapshot(
				"unknown",
				"unknown",
				"Unknown",
				"Other",
				"1",
				"index",
				"2026-05",
				"2026-05",
				"",
				"",
				"1",
				"0",
				"0.0%",
				"No source.",
				"2026-06-12T09:00:00+09:00");

		EconomyDashboardDtos.AiBrief brief = RuleBasedBriefFactory.fallback(
				List.of(sourced, unsourced),
				List.of(),
				"fallback:test");

		assertTrue(brief.evidenceMetricIds().contains("cpi"));
		assertFalse(brief.evidenceMetricIds().contains("unknown"));
		assertEquals("fallback:test", brief.generationStatus());
	}
}
