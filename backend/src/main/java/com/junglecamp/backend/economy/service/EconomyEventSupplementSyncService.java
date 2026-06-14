package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.repository.EconomySnapshotRepository;
import java.time.format.DateTimeFormatter;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class EconomyEventSupplementSyncService {

	private final EconomySnapshotRepository repository;
	private final RestClient fredClient;
	private final RestClient blsClient;
	private final RestClient beaClient;
	private final String fredApiKey;

	@Autowired
	public EconomyEventSupplementSyncService(
			EconomySnapshotRepository repository,
			@Value("${app.economy.fred.api-key:}") String fredApiKey) {
		this(
				repository,
				RestClient.create("https://api.stlouisfed.org"),
				RestClient.create("https://www.bls.gov"),
				RestClient.create("https://apps.bea.gov"),
				fredApiKey);
	}

	EconomyEventSupplementSyncService(
			EconomySnapshotRepository repository,
			RestClient fredClient,
			RestClient blsClient,
			RestClient beaClient,
			String fredApiKey) {
		this.repository = repository;
		this.fredClient = fredClient;
		this.blsClient = blsClient;
		this.beaClient = beaClient;
		this.fredApiKey = fredApiKey;
	}

	public void syncAll() {
		syncBlsCalendar();
		syncBeaSchedule();
		syncFredReleaseDates();
	}

	private void syncBlsCalendar() {
		String ics = blsClient.get()
				.uri("/schedule/news_release/bls.ics")
				.retrieve()
				.body(String.class);
		for (ParsedCalendarEvent event : parseIcs(ics)) {
			repository.upsertEvent(toEconomicEvent("BLS", event, "https://www.bls.gov/schedule/news_release/"));
		}
	}

	@SuppressWarnings("unchecked")
	private void syncBeaSchedule() {
		Map<String, Object> response = beaClient.get()
				.uri("/API/signup/release_dates.json")
				.retrieve()
				.body(Map.class);
		if (response == null) {
			return;
		}
		for (Map.Entry<String, Object> entry : response.entrySet()) {
			if ("file_last_updated".equals(entry.getKey()) || !(entry.getValue() instanceof Map<?, ?> item)) {
				continue;
			}
			Object dates = item.get("release_dates");
			if (!(dates instanceof List<?> releaseDates)) {
				continue;
			}
			for (Object releaseDate : releaseDates) {
				ParsedCalendarEvent event = new ParsedCalendarEvent(entry.getKey(), releaseDate.toString());
				repository.upsertEvent(toEconomicEvent("BEA", event, "https://www.bea.gov/news/schedule"));
			}
		}
	}

	@SuppressWarnings("unchecked")
	private void syncFredReleaseDates() {
		if (fredApiKey == null || fredApiKey.isBlank()) {
			return;
		}
		Map<String, Object> response = fredClient.get()
				.uri(uriBuilder -> uriBuilder
						.path("/fred/releases/dates")
						.queryParam("api_key", fredApiKey)
						.queryParam("file_type", "json")
						.queryParam("include_release_dates_with_no_data", "true")
						.queryParam("realtime_start", LocalDate.now())
						.queryParam("realtime_end", LocalDate.now().plusMonths(6))
						.queryParam("limit", 1000)
						.build())
				.retrieve()
				.body(Map.class);
		Object dates = response == null ? null : response.get("release_dates");
		if (!(dates instanceof List<?> releaseDates)) {
			return;
		}
		for (Object item : releaseDates) {
			if (item instanceof Map<?, ?> release) {
				Object releaseName = release.get("release_name");
				String title = releaseName == null ? "FRED release" : releaseName.toString();
				String date = String.valueOf(release.get("date"));
				repository.upsertEvent(toEconomicEvent("FRED", new ParsedCalendarEvent(title, date), "https://fred.stlouisfed.org/releases/calendar"));
			}
		}
	}

	private List<ParsedCalendarEvent> parseIcs(String ics) {
		List<ParsedCalendarEvent> events = new ArrayList<>();
		if (ics == null || ics.isBlank()) {
			return events;
		}
		String title = "";
		String startsAt = "";
		for (String rawLine : ics.replace("\r\n ", "").replace("\n ", "").split("\\R")) {
			String line = rawLine.trim();
			if (line.startsWith("SUMMARY:")) {
				title = line.substring("SUMMARY:".length()).replace("\\,", ",");
			}
			if (line.startsWith("DTSTART")) {
				int index = line.indexOf(':');
				if (index >= 0) {
					startsAt = line.substring(index + 1);
				}
			}
			if ("END:VEVENT".equals(line) && !title.isBlank() && !startsAt.isBlank()) {
				events.add(new ParsedCalendarEvent(title, startsAt));
				title = "";
				startsAt = "";
			}
		}
		return events;
	}

	private EconomicEvent toEconomicEvent(String sourceType, ParsedCalendarEvent parsed, String sourceUrl) {
		OffsetDateTime releaseTime = parseDateTime(parsed.startsAt());
		String category = category(parsed.title());
		String metricId = relatedMetricId(category);
		String sourceEventId = eventId(parsed.title(), releaseTime);
		return new EconomicEvent(
				sourceType.toLowerCase(Locale.ROOT) + "-" + sourceEventId,
				parsed.title(),
				releaseTime.toString(),
				importance(category),
				"",
				"",
				null,
				"",
				releaseTime.isAfter(OffsetDateTime.now()) ? "scheduled" : "released",
				sourceType + " release calendar event.",
				sourceType,
				sourceUrl,
				metricId.isBlank() ? List.of() : List.of(metricId),
				sourceType,
				sourceEventId,
				category,
				OffsetDateTime.now().toString(),
				"paid_or_manual_required",
				null);
	}

	private OffsetDateTime parseDateTime(String value) {
		try {
			if (value.endsWith("Z")) {
				return OffsetDateTime.parse(value, DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmssX"));
			}
			if (value.matches("\\d{8}T\\d{6}")) {
				return java.time.LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss"))
						.atOffset(ZoneOffset.UTC);
			}
			if (value.matches("\\d{4}-\\d{2}-\\d{2}")) {
				return LocalDate.parse(value).atStartOfDay().atOffset(ZoneOffset.UTC);
			}
			return OffsetDateTime.parse(value);
		} catch (Exception exception) {
			return OffsetDateTime.now();
		}
	}

	private String eventId(String title, OffsetDateTime releaseTime) {
		String slug = title.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("(^-|-$)", "");
		if (slug.length() > 48) {
			slug = slug.substring(0, 48);
		}
		return slug + "-" + releaseTime.toLocalDate() + "-" + Integer.toHexString((title + releaseTime).hashCode());
	}

	private String category(String title) {
		String normalized = title.toLowerCase(Locale.ROOT);
		if (normalized.contains("consumer price") || normalized.contains("cpi") || normalized.contains("price index")) {
			return "inflation";
		}
		if (normalized.contains("employment") || normalized.contains("job") || normalized.contains("unemployment")) {
			return "jobs";
		}
		if (normalized.contains("gdp") || normalized.contains("domestic product")) {
			return "growth";
		}
		if (normalized.contains("personal income") || normalized.contains("outlays") || normalized.contains("retail")) {
			return "consumption";
		}
		if (normalized.contains("import") || normalized.contains("export") || normalized.contains("trade")) {
			return "trade";
		}
		return "general";
	}

	private String relatedMetricId(String category) {
		return switch (category) {
			case "inflation" -> "cpi";
			case "jobs" -> "unemployment";
			case "growth" -> "gdp-growth";
			case "consumption" -> "pce";
			default -> "";
		};
	}

	private String importance(String category) {
		return switch (category) {
			case "inflation", "jobs", "growth" -> "high";
			case "consumption", "trade" -> "medium";
			default -> "low";
		};
	}

	private record ParsedCalendarEvent(String title, String startsAt) {
	}
}
