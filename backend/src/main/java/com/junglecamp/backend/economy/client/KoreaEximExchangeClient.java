package com.junglecamp.backend.economy.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ExchangeRate;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class KoreaEximExchangeClient {

	static final String SOURCE_NAME = "\uD55C\uAD6D\uC218\uCD9C\uC785\uC740\uD589";
	static final String SOURCE_URL = "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON";
	private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

	private final RestClient restClient;
	private final String apiKey;
	private final Clock clock;

	@Autowired
	public KoreaEximExchangeClient(
			@Value("${app.economy.koreaexim.api-key:}") String apiKey) {
		this(RestClient.create("https://oapi.koreaexim.go.kr"), apiKey, Clock.systemUTC());
	}

	public KoreaEximExchangeClient(RestClient restClient, String apiKey, Clock clock) {
		this.restClient = restClient;
		this.apiKey = apiKey;
		this.clock = clock;
	}

	public List<ExchangeRate> fetchLatestDefaultRates() {
		if (apiKey == null || apiKey.isBlank()) {
			throw new IllegalStateException("KOREAEXIM_API_KEY is not configured");
		}

		LocalDate searchDate = initialSearchDate();
		for (int attempt = 0; attempt < 7; attempt++) {
			LocalDate baseDate = searchDate;
			List<KoreaEximExchangeItem> items = fetch(baseDate);
			List<ExchangeRate> rates = items.stream()
					.map(item -> toExchangeRate(item, baseDate))
					.filter(rate -> !rate.currencyCode().isBlank())
					.toList();
			if (!rates.isEmpty()) {
				return rates;
			}
			searchDate = previousBusinessDay(searchDate.minusDays(1));
		}
		return List.of();
	}

	private List<KoreaEximExchangeItem> fetch(LocalDate searchDate) {
		KoreaEximExchangeItem[] response = restClient.post()
				.uri(uriBuilder -> uriBuilder
						.path("/site/program/financial/exchangeJSON")
						.queryParam("authkey", apiKey)
						.queryParam("searchdate", searchDate.toString().replace("-", ""))
						.queryParam("data", "AP01")
						.build())
				.retrieve()
				.body(KoreaEximExchangeItem[].class);
		return response == null ? List.of() : Arrays.asList(response);
	}

	private ExchangeRate toExchangeRate(KoreaEximExchangeItem item, LocalDate baseDate) {
		return new ExchangeRate(
				currencyCode(item.currencyUnit()),
				blankToFallback(item.currencyName(), currencyCode(item.currencyUnit())),
				baseDate.toString(),
				cleanRate(item.dealBaseRate()),
				cleanRate(item.ttb()),
				cleanRate(item.tts()),
				SOURCE_NAME,
				SOURCE_URL,
				OffsetDateTime.now(clock).toString());
	}

	private LocalDate initialSearchDate() {
		LocalDateTime now = LocalDateTime.now(clock.withZone(KOREA_ZONE));
		LocalDate today = now.toLocalDate();
		if (isWeekend(today)) {
			return previousBusinessDay(today.minusDays(1));
		}
		if (now.getHour() < 11) {
			return previousBusinessDay(today.minusDays(1));
		}
		return today;
	}

	private LocalDate previousBusinessDay(LocalDate date) {
		LocalDate cursor = date;
		while (isWeekend(cursor)) {
			cursor = cursor.minusDays(1);
		}
		return cursor;
	}

	private boolean isWeekend(LocalDate date) {
		DayOfWeek day = date.getDayOfWeek();
		return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
	}

	private String currencyCode(String currencyUnit) {
		if (currencyUnit == null || currencyUnit.isBlank()) {
			return "";
		}
		int parenthesis = currencyUnit.indexOf('(');
		String code = parenthesis >= 0 ? currencyUnit.substring(0, parenthesis) : currencyUnit;
		return code.trim().toUpperCase(Locale.ROOT);
	}

	private String cleanRate(String value) {
		return value == null ? "" : value.trim().replace(",", "");
	}

	private String blankToFallback(String value, String fallback) {
		return value == null || value.isBlank() ? fallback : value.trim();
	}

	record KoreaEximExchangeItem(
			@JsonProperty("cur_unit") String currencyUnit,
			@JsonProperty("cur_nm") String currencyName,
			@JsonProperty("deal_bas_r") String dealBaseRate,
			@JsonProperty("ttb") String ttb,
			@JsonProperty("tts") String tts) {
	}
}
