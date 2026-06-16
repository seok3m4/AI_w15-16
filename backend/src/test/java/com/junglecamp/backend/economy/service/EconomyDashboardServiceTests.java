package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.repository.EconomySnapshotRepository;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AiBrief;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomyDashboard;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EconomyDashboardServiceTests {

	@Test
	void dashboardReadsCachedDataWithoutStartingEconomySync() {
		EconomySnapshotRepository repository = mock(EconomySnapshotRepository.class);
		EconomySyncService syncService = mock(EconomySyncService.class);
		KoreaEximExchangeSyncService exchangeSyncService = mock(KoreaEximExchangeSyncService.class);
		EconomyDashboardService dashboardService = new EconomyDashboardService(
				repository,
				syncService,
				exchangeSyncService,
				new EconomyTextCatalog());

		when(repository.findLatestMetrics()).thenReturn(List.of());
		when(repository.findEvents()).thenReturn(List.of());
		when(repository.findExchangeRates()).thenReturn(List.of());
		when(repository.findLatestBrief(eq(SupportedLocale.EN))).thenReturn(Optional.empty());

		dashboardService.dashboard(SupportedLocale.EN);

		verifyNoInteractions(syncService);
	}

	@Test
	void dashboardDoesNotExposeCachedOpenAiErrorFallbackAndRefreshesInBackground() {
		EconomySnapshotRepository repository = mock(EconomySnapshotRepository.class);
		EconomySyncService syncService = mock(EconomySyncService.class);
		KoreaEximExchangeSyncService exchangeSyncService = mock(KoreaEximExchangeSyncService.class);
		EconomyDashboardService dashboardService = new EconomyDashboardService(
				repository,
				syncService,
				exchangeSyncService,
				new EconomyTextCatalog());
		AiBrief cachedFailure = new AiBrief(
				"old fallback",
				"fallback",
				List.of(),
				List.of(),
				"old impact",
				List.of("old risk"),
				OffsetDateTime.parse("2026-06-15T00:00:00Z").toString(),
				"fallback:openai-error");

		when(repository.findLatestMetrics()).thenReturn(List.of());
		when(repository.findEvents()).thenReturn(List.of());
		when(repository.findExchangeRates()).thenReturn(List.of());
		when(repository.findLatestBrief(eq(SupportedLocale.EN))).thenReturn(Optional.of(cachedFailure));

		EconomyDashboard dashboard = dashboardService.dashboard(SupportedLocale.EN);

		assertThat(dashboard.brief().generationStatus()).isEqualTo("fallback:refreshing-ai-brief");
		assertThat(dashboard.brief().summary()).isNotEqualTo("old fallback");
		verify(syncService).refreshInBackground();
	}
}
