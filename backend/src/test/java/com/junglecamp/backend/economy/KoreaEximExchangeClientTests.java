package com.junglecamp.backend.economy;

import com.junglecamp.backend.economy.client.KoreaEximExchangeClient;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ExchangeRate;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.assertThat;

class KoreaEximExchangeClientTests {

	@Test
	void usesPreviousBusinessDayBeforeKoreaNoticeHour() throws Exception {
		try (FakeExchangeServer server = new FakeExchangeServer()) {
			KoreaEximExchangeClient client = new KoreaEximExchangeClient(
					RestClient.create(server.baseUrl()),
					"test-key",
					Clock.fixed(Instant.parse("2026-06-12T01:30:00Z"), ZoneOffset.UTC));

			List<ExchangeRate> rates = client.fetchLatestDefaultRates();

			assertThat(server.searchDates()).containsExactly("20260611");
			assertThat(rates).extracting(ExchangeRate::currencyCode).containsExactly("USD");
			assertThat(rates.getFirst().baseDate()).isEqualTo("2026-06-11");
		}
	}

	@Test
	void usesTodayAfterKoreaNoticeHour() throws Exception {
		try (FakeExchangeServer server = new FakeExchangeServer()) {
			KoreaEximExchangeClient client = new KoreaEximExchangeClient(
					RestClient.create(server.baseUrl()),
					"test-key",
					Clock.fixed(Instant.parse("2026-06-12T02:30:00Z"), ZoneOffset.UTC));

			List<ExchangeRate> rates = client.fetchLatestDefaultRates();

			assertThat(server.searchDates()).containsExactly("20260612");
			assertThat(rates.getFirst().baseDate()).isEqualTo("2026-06-12");
		}
	}

	@Test
	void usesPreviousFridayOnWeekend() throws Exception {
		try (FakeExchangeServer server = new FakeExchangeServer()) {
			KoreaEximExchangeClient client = new KoreaEximExchangeClient(
					RestClient.create(server.baseUrl()),
					"test-key",
					Clock.fixed(Instant.parse("2026-06-13T04:00:00Z"), ZoneOffset.UTC));

			List<ExchangeRate> rates = client.fetchLatestDefaultRates();

			assertThat(server.searchDates()).containsExactly("20260612");
			assertThat(rates.getFirst().baseDate()).isEqualTo("2026-06-12");
		}
	}

	private static final class FakeExchangeServer implements AutoCloseable {

		private final HttpServer server;
		private final List<String> searchDates = new ArrayList<>();

		FakeExchangeServer() throws IOException {
			server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
			server.createContext("/site/program/financial/exchangeJSON", exchange -> {
				String searchDate = queryParam(exchange.getRequestURI(), "searchdate");
				searchDates.add(searchDate);
				byte[] bytes = """
						[
						  {
						    "cur_unit": "USD",
						    "cur_nm": "미국 달러",
						    "deal_bas_r": "1,375.50",
						    "ttb": "1,362.00",
						    "tts": "1,389.00"
						  }
						]
						""".getBytes(StandardCharsets.UTF_8);
				exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
				exchange.sendResponseHeaders(200, bytes.length);
				exchange.getResponseBody().write(bytes);
				exchange.close();
			});
			server.start();
		}

		String baseUrl() {
			return "http://127.0.0.1:" + server.getAddress().getPort();
		}

		List<String> searchDates() {
			return List.copyOf(searchDates);
		}

		@Override
		public void close() {
			server.stop(0);
		}

		private static String queryParam(URI uri, String key) {
			String query = uri.getRawQuery();
			if (query == null || query.isBlank()) {
				return "";
			}
			for (String part : query.split("&")) {
				String[] pieces = part.split("=", 2);
				if (pieces.length == 2 && pieces[0].equals(key)) {
					return pieces[1];
				}
			}
			return "";
		}
	}
}
