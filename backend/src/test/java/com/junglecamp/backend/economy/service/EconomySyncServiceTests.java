package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.client.FredSeriesClient;
import com.junglecamp.backend.economy.definition.MetricDefinition;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AiBrief;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.repository.EconomySnapshotRepository;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EconomySyncServiceTests {

	@Test
	void syncAllCallsOpenAiForEveryLocaleAndSavesEachGeneratedBrief() {
		FredSeriesClient fredSeriesClient = mock(FredSeriesClient.class);
		EconomySnapshotRepository repository = mock(EconomySnapshotRepository.class);
		OpenAiBriefService openAiBriefService = mock(OpenAiBriefService.class);
		EconomySourceComparisonSyncService sourceComparisonSyncService = mock(EconomySourceComparisonSyncService.class);
		EconomyEventSupplementSyncService eventSupplementSyncService = mock(EconomyEventSupplementSyncService.class);
		EconomySyncService service = service(
				fredSeriesClient,
				repository,
				openAiBriefService,
				sourceComparisonSyncService,
				eventSupplementSyncService,
				20);
		List<EconomicEvent> events = List.of(event());
		AiBrief englishBrief = generatedBrief("English generated summary", "English Korea impact");
		AiBrief koreanBrief = generatedBrief("KO OpenAI summary", "KO OpenAI Korea impact");

		when(fredSeriesClient.fetchLatest(any(MetricDefinition.class)))
				.thenAnswer(invocation -> snapshot(invocation.getArgument(0)));
		when(fredSeriesClient.fetchHistory(any(MetricDefinition.class), any(LocalDate.class)))
				.thenReturn(List.of());
		when(repository.findEvents()).thenReturn(events);
		when(openAiBriefService.generate(anyList(), eq(events), eq(SupportedLocale.EN)))
				.thenReturn(englishBrief);
		when(openAiBriefService.generate(anyList(), eq(events), eq(SupportedLocale.KO)))
				.thenReturn(koreanBrief);
		when(openAiBriefService.generate(anyList(), eq(events), eq(SupportedLocale.ZH_HANS)))
				.thenReturn(generatedBrief("ZH Hans OpenAI summary"));
		when(openAiBriefService.generate(anyList(), eq(events), eq(SupportedLocale.ZH_HANT)))
				.thenReturn(generatedBrief("ZH Hant OpenAI summary"));
		when(openAiBriefService.generate(anyList(), eq(events), eq(SupportedLocale.JA)))
				.thenReturn(generatedBrief("JA OpenAI summary"));
		when(openAiBriefService.model()).thenReturn("gpt-test");

		service.syncAll();

		verify(openAiBriefService, times(SupportedLocale.values().length))
				.generate(anyList(), eq(events), any(SupportedLocale.class));

		ArgumentCaptor<AiBrief> briefCaptor = ArgumentCaptor.forClass(AiBrief.class);
		ArgumentCaptor<SupportedLocale> localeCaptor = ArgumentCaptor.forClass(SupportedLocale.class);
		verify(repository, times(SupportedLocale.values().length))
				.saveBrief(briefCaptor.capture(), eq("gpt-test"), localeCaptor.capture());
		assertThat(localeCaptor.getAllValues()).containsExactlyInAnyOrder(SupportedLocale.values());

		AiBrief savedEnglish = briefFor(localeCaptor.getAllValues(), briefCaptor.getAllValues(), SupportedLocale.EN);
		AiBrief savedKorean = briefFor(localeCaptor.getAllValues(), briefCaptor.getAllValues(), SupportedLocale.KO);
		assertThat(savedEnglish.summary()).isEqualTo("English generated summary");
		assertThat(savedKorean.summary()).isEqualTo("KO OpenAI summary");
		assertThat(savedKorean.koreaImpact()).isEqualTo("KO OpenAI Korea impact");
	}

	@Test
	void scheduledSyncRunsEveryFourHoursAndDoesNotRunOnApplicationStartup() throws NoSuchMethodException {
		Scheduled scheduled = EconomySyncService.class.getMethod("scheduledSync").getAnnotation(Scheduled.class);

		assertThat(scheduled.fixedRateString()).isEqualTo("${app.economy.sync.fixed-rate-ms:14400000}");
		assertThat(Arrays.stream(EconomySyncService.class.getDeclaredMethods())
				.flatMap(method -> Arrays.stream(method.getAnnotations()))
				.noneMatch(annotation -> annotation.annotationType().equals(EventListener.class)))
				.isTrue();
	}

	@Test
	void syncAllDoesNotPersistFallbackBriefWhenOpenAiGenerationFails() {
		FredSeriesClient fredSeriesClient = mock(FredSeriesClient.class);
		EconomySnapshotRepository repository = mock(EconomySnapshotRepository.class);
		OpenAiBriefService openAiBriefService = mock(OpenAiBriefService.class);
		EconomySourceComparisonSyncService sourceComparisonSyncService = mock(EconomySourceComparisonSyncService.class);
		EconomyEventSupplementSyncService eventSupplementSyncService = mock(EconomyEventSupplementSyncService.class);
		EconomySyncService service = service(
				fredSeriesClient,
				repository,
				openAiBriefService,
				sourceComparisonSyncService,
				eventSupplementSyncService,
				20);
		List<EconomicEvent> events = List.of(event());
		AiBrief fallbackBrief = new AiBrief(
				"Fallback summary",
				"Fallback status",
				List.of("cpi"),
				List.of(),
				"Fallback Korea impact",
				List.of("Fallback risk"),
				OffsetDateTime.parse("2026-06-15T00:00:00Z").toString(),
				"fallback:openai-error");

		when(fredSeriesClient.fetchLatest(any(MetricDefinition.class)))
				.thenAnswer(invocation -> snapshot(invocation.getArgument(0)));
		when(fredSeriesClient.fetchHistory(any(MetricDefinition.class), any(LocalDate.class)))
				.thenReturn(List.of());
		when(repository.findEvents()).thenReturn(events);
		for (SupportedLocale locale : SupportedLocale.values()) {
			when(openAiBriefService.generate(anyList(), eq(events), eq(locale))).thenReturn(fallbackBrief);
		}
		when(openAiBriefService.model()).thenReturn("gpt-test");

		service.syncAll();

		verify(repository, never()).saveBrief(any(AiBrief.class), eq("gpt-test"), any(SupportedLocale.class));
	}

	@Test
	void syncAllSkipsExternalCallsWhenDailyLimitIsReached() {
		FredSeriesClient fredSeriesClient = mock(FredSeriesClient.class);
		EconomySnapshotRepository repository = mock(EconomySnapshotRepository.class);
		OpenAiBriefService openAiBriefService = mock(OpenAiBriefService.class);
		EconomySourceComparisonSyncService sourceComparisonSyncService = mock(EconomySourceComparisonSyncService.class);
		EconomyEventSupplementSyncService eventSupplementSyncService = mock(EconomyEventSupplementSyncService.class);
		EconomySyncService service = service(
				fredSeriesClient,
				repository,
				openAiBriefService,
				sourceComparisonSyncService,
				eventSupplementSyncService,
				20);

		when(repository.countSyncRunsSince(eq("FRED"), any(OffsetDateTime.class))).thenReturn(20);

		service.syncAll();

		verify(fredSeriesClient, never()).fetchLatest(any(MetricDefinition.class));
		verify(openAiBriefService, never()).generate(anyList(), anyList(), any(SupportedLocale.class));
		verify(repository).recordSyncRun(
				eq("FRED"),
				any(OffsetDateTime.class),
				any(OffsetDateTime.class),
				eq("skipped"),
				eq("daily_limit_reached"));
	}

	private EconomySyncService service(
			FredSeriesClient fredSeriesClient,
			EconomySnapshotRepository repository,
			OpenAiBriefService openAiBriefService,
			EconomySourceComparisonSyncService sourceComparisonSyncService,
			EconomyEventSupplementSyncService eventSupplementSyncService,
			int dailyLimit) {
		return new EconomySyncService(
				fredSeriesClient,
				repository,
				openAiBriefService,
				sourceComparisonSyncService,
				eventSupplementSyncService,
				240,
				true,
				dailyLimit);
	}

	private AiBrief briefFor(
			List<SupportedLocale> locales,
			List<AiBrief> briefs,
			SupportedLocale locale) {
		int index = locales.indexOf(locale);
		assertThat(index).isNotNegative();
		return briefs.get(index);
	}

	private EconomyMetricSnapshot snapshot(MetricDefinition definition) {
		return new EconomyMetricSnapshot(
				definition.id(),
				definition.seriesId(),
				definition.name(),
				definition.category(),
				"4.2",
				definition.unit(),
				"2026-05",
				"2026-05",
				"FRED",
				definition.sourceUrl(),
				"4.0",
				"+0.2",
				"+0.2%",
				definition.interpretation(),
				OffsetDateTime.now().toString());
	}

	private AiBrief generatedBrief(String summary) {
		return generatedBrief(summary, "Korea impact");
	}

	private AiBrief generatedBrief(String summary, String koreaImpact) {
		return new AiBrief(
				summary,
				"AI check",
				List.of("cpi"),
				List.of("event-cpi"),
				koreaImpact,
				List.of("Risk"),
				OffsetDateTime.parse("2026-06-15T00:00:00Z").toString(),
				"generated");
	}

	private EconomicEvent event() {
		return new EconomicEvent(
				"event-cpi",
				"CPI release",
				"2026-06-15T00:00:00Z",
				"high",
				"4.0",
				"4.1",
				"4.2",
				"% YoY",
				"released",
				"CPI was released.",
				"BLS",
				"https://www.bls.gov/cpi/",
				List.of("cpi"),
				"BLS",
				"cpi-release",
				"prices",
				"2026-06-15T00:00:00Z",
				"available",
				null);
	}
}
