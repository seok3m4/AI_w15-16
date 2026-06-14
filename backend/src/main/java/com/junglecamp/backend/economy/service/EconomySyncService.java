package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.client.FredSeriesClient;
import com.junglecamp.backend.economy.definition.EconomyMetricDefinitions;
import com.junglecamp.backend.economy.definition.MetricDefinition;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AiBrief;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.repository.EconomySnapshotRepository;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.CompletableFuture;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class EconomySyncService {

	private final FredSeriesClient fredSeriesClient;
	private final EconomySnapshotRepository repository;
	private final OpenAiBriefService openAiBriefService;
	private final EconomyTextCatalog textCatalog;
	private final EconomySourceComparisonSyncService sourceComparisonSyncService;
	private final EconomyEventSupplementSyncService eventSupplementSyncService;
	private final Duration staleAfter;
	private final boolean enabled;
	private final AtomicBoolean syncing = new AtomicBoolean(false);

	public EconomySyncService(
			FredSeriesClient fredSeriesClient,
			EconomySnapshotRepository repository,
			OpenAiBriefService openAiBriefService,
			EconomyTextCatalog textCatalog,
			EconomySourceComparisonSyncService sourceComparisonSyncService,
			EconomyEventSupplementSyncService eventSupplementSyncService,
			@Value("${app.economy.sync.stale-after-minutes:60}") long staleAfterMinutes,
			@Value("${app.economy.sync.enabled:true}") boolean enabled) {
		this.fredSeriesClient = fredSeriesClient;
		this.repository = repository;
		this.openAiBriefService = openAiBriefService;
		this.textCatalog = textCatalog;
		this.sourceComparisonSyncService = sourceComparisonSyncService;
		this.eventSupplementSyncService = eventSupplementSyncService;
		this.staleAfter = Duration.ofMinutes(staleAfterMinutes);
		this.enabled = enabled;
	}

	@EventListener(ApplicationReadyEvent.class)
	public void syncOnStartup() {
		refreshInBackground();
	}

	@Scheduled(fixedRateString = "${app.economy.sync.fixed-rate-ms:1800000}")
	public void scheduledSync() {
		syncAll();
	}

	public void refreshIfStale() {
		if (!enabled) {
			return;
		}
		boolean stale = repository.latestMetricsUpdatedAt()
				.map(updatedAt -> Duration.between(updatedAt, OffsetDateTime.now()).compareTo(staleAfter) > 0)
				.orElse(true);
		if (stale) {
			refreshInBackground();
		}
	}

	public void refreshInBackground() {
		if (!enabled || syncing.get()) {
			return;
		}
		CompletableFuture.runAsync(this::syncAll);
	}

	public void syncAll() {
		if (!enabled || !syncing.compareAndSet(false, true)) {
			return;
		}

		OffsetDateTime startedAt = OffsetDateTime.now();
		try {
			List<EconomyMetricSnapshot> snapshots = new ArrayList<>();
			for (MetricDefinition definition : EconomyMetricDefinitions.all()) {
				snapshots.add(fredSeriesClient.fetchLatest(definition));
				syncFredHistory(definition);
			}
			repository.replaceMetrics(snapshots);
			syncSourceComparisons();
			syncEventSupplements();

			List<EconomicEvent> events = repository.findEvents();
			for (SupportedLocale locale : SupportedLocale.values()) {
				List<EconomyMetricSnapshot> localizedSnapshots = snapshots.stream()
						.map(snapshot -> textCatalog.localizeMetric(snapshot, locale))
						.toList();
				AiBrief brief = openAiBriefService.generate(localizedSnapshots, events, locale);
				if ("generated".equals(brief.generationStatus())) {
					repository.saveBrief(brief, openAiBriefService.model(), locale);
				}
			}
			repository.recordSyncRun("FRED", startedAt, OffsetDateTime.now(), "success", null);
		} catch (Exception exception) {
			repository.recordSyncRun("FRED", startedAt, OffsetDateTime.now(), "failed", exception.getMessage());
		} finally {
			syncing.set(false);
		}
	}

	private void syncSourceComparisons() {
		try {
			sourceComparisonSyncService.syncAll();
		} catch (Exception exception) {
			repository.recordSyncRun("SOURCE_COMPARISON", OffsetDateTime.now(), OffsetDateTime.now(), "failed", exception.getMessage());
		}
	}

	private void syncEventSupplements() {
		try {
			eventSupplementSyncService.syncAll();
		} catch (Exception exception) {
			repository.recordSyncRun("ECON_EVENTS", OffsetDateTime.now(), OffsetDateTime.now(), "failed", exception.getMessage());
		}
	}

	private void syncFredHistory(MetricDefinition definition) {
		try {
			repository.replaceMetricObservations(
					definition,
					fredSeriesClient.fetchHistory(definition, LocalDate.now().minusYears(5)));
		} catch (Exception exception) {
			repository.recordSyncRun("FRED_HISTORY", OffsetDateTime.now(), OffsetDateTime.now(), "failed", exception.getMessage());
		}
	}
}
