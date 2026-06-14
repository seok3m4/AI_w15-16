package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.client.KoreaEximExchangeClient;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ExchangeRate;
import com.junglecamp.backend.economy.repository.EconomySnapshotRepository;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.CompletableFuture;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class KoreaEximExchangeSyncService {

	private final KoreaEximExchangeClient client;
	private final EconomySnapshotRepository repository;
	private final boolean enabled;
	private final Duration staleAfter;
	private final AtomicBoolean syncing = new AtomicBoolean(false);

	public KoreaEximExchangeSyncService(
			KoreaEximExchangeClient client,
			EconomySnapshotRepository repository,
			@Value("${app.economy.koreaexim.enabled:true}") boolean enabled,
			@Value("${app.economy.koreaexim.stale-after-minutes:55}") long staleAfterMinutes) {
		this.client = client;
		this.repository = repository;
		this.enabled = enabled;
		this.staleAfter = Duration.ofMinutes(staleAfterMinutes);
	}

	@EventListener(ApplicationReadyEvent.class)
	public void syncOnStartup() {
		refreshIfStale();
	}

	@Scheduled(fixedRateString = "${app.economy.koreaexim.fixed-rate-ms:300000}")
	public void hourlySync() {
		syncNow();
	}

	@Scheduled(cron = "${app.economy.koreaexim.business-day-cron:0 10 11 * * MON-FRI}", zone = "Asia/Seoul")
	public void businessDayPostNoticeSync() {
		syncNow();
	}

	public void refreshIfStale() {
		if (!enabled) {
			return;
		}
		boolean stale = repository.latestExchangeRatesUpdatedAt()
				.map(updatedAt -> Duration.between(updatedAt, OffsetDateTime.now()).compareTo(staleAfter) > 0)
				.orElse(true);
		if (stale) {
			refreshInBackground();
		}
	}

	void refreshInBackground() {
		if (!enabled || syncing.get()) {
			return;
		}
		CompletableFuture.runAsync(this::syncNow);
	}

	void syncNow() {
		if (!enabled || !syncing.compareAndSet(false, true)) {
			return;
		}

		OffsetDateTime startedAt = OffsetDateTime.now();
		try {
			List<ExchangeRate> rates = client.fetchLatestDefaultRates();
			if (!rates.isEmpty()) {
				repository.replaceExchangeRates(rates);
			}
			repository.recordSyncRun("KOREAEXIM_EXCHANGE", startedAt, OffsetDateTime.now(), "success", null);
		} catch (Exception exception) {
			repository.recordSyncRun("KOREAEXIM_EXCHANGE", startedAt, OffsetDateTime.now(), "failed", exception.getMessage());
		} finally {
			syncing.set(false);
		}
	}
}
