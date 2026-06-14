package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.definition.EconomyMetricDefinitions;
import com.junglecamp.backend.economy.definition.MetricDefinition;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MetricSourceComparison;
import com.junglecamp.backend.economy.repository.EconomySnapshotRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class EconomySourceComparisonSyncService {

	private final EconomySnapshotRepository repository;
	private final RestClient blsClient;
	private final RestClient beaClient;
	private final RestClient alphaClient;
	private final String blsApiKey;
	private final String beaApiKey;
	private final String alphaVantageApiKey;

	@Autowired
	public EconomySourceComparisonSyncService(
			EconomySnapshotRepository repository,
			@Value("${app.economy.bls.api-key:}") String blsApiKey,
			@Value("${app.economy.bea.api-key:}") String beaApiKey,
			@Value("${app.economy.alpha-vantage.api-key:}") String alphaVantageApiKey) {
		this(
				repository,
				RestClient.create("https://api.bls.gov"),
				RestClient.create("https://apps.bea.gov"),
				RestClient.create("https://www.alphavantage.co"),
				blsApiKey,
				beaApiKey,
				alphaVantageApiKey);
	}

	public EconomySourceComparisonSyncService(
			EconomySnapshotRepository repository,
			RestClient blsClient,
			RestClient beaClient,
			RestClient alphaClient,
			String blsApiKey,
			String beaApiKey,
			String alphaVantageApiKey) {
		this.repository = repository;
		this.blsClient = blsClient;
		this.beaClient = beaClient;
		this.alphaClient = alphaClient;
		this.blsApiKey = blsApiKey;
		this.beaApiKey = beaApiKey;
		this.alphaVantageApiKey = alphaVantageApiKey;
	}

	public void syncAll() {
		for (MetricDefinition definition : EconomyMetricDefinitions.all()) {
			for (EconomySupplementService.SourceSpec spec : EconomySupplementService.sourceSpecs(definition.id())) {
				repository.upsertSourceComparison(definition.id(), fetch(definition.id(), spec));
			}
		}
	}

	public MetricSourceComparison fetch(String metricId, EconomySupplementService.SourceSpec spec) {
		if (!hasProviderKey(spec.provider())) {
			return failure(spec, "missing_config", spec.provider() + " API key is not configured.");
		}
		try {
			return switch (spec.provider()) {
				case "BLS" -> fetchBls(metricId, spec);
				case "BEA" -> fetchBea(metricId, spec);
				case "ALPHA_VANTAGE" -> fetchAlpha(spec);
				default -> failure(spec, "unsupported_mapping", "Unsupported source provider.");
			};
		} catch (Exception exception) {
			return failure(spec, classifyException(exception), exception.getMessage());
		}
	}

	@SuppressWarnings("unchecked")
	private MetricSourceComparison fetchBls(String metricId, EconomySupplementService.SourceSpec spec) {
		Map<String, Object> response = blsClient.get()
				.uri(uriBuilder -> uriBuilder
						.path("/publicAPI/v2/timeseries/data/{seriesId}")
						.queryParam("registrationkey", blsApiKey)
						.build(spec.providerSeriesId()))
				.retrieve()
				.body(Map.class);
		MetricSourceComparison failure = blsFailure(response, spec);
		if (failure != null) {
			return failure;
		}
		List<Map<String, Object>> data = blsData(response);
		Map<String, Object> latest = data.get(0);
		String rawValue = string(latest.get("value"));
		String baseDate = blsBaseDate(string(latest.get("year")), string(latest.get("period")));
		NormalizedValue normalized = normalizeBls(metricId, spec, data, latest);
		return comparison(
				spec,
				rawValue,
				spec.unit(),
				normalized.value(),
				normalized.unit(),
				baseDate,
				"synced",
				null,
				normalized.note());
	}

	@SuppressWarnings("unchecked")
	private MetricSourceComparison fetchBea(String metricId, EconomySupplementService.SourceSpec spec) {
		if (!"gdp-growth".equals(metricId)) {
			return failure(spec, "unsupported_mapping", "BEA direct comparison mapping is not available for " + metricId + ".");
		}
		Map<String, Object> response = beaClient.get()
				.uri(uriBuilder -> uriBuilder
						.path("/api/data")
						.queryParam("UserID", beaApiKey)
						.queryParam("method", "GetData")
						.queryParam("datasetname", "NIPA")
						.queryParam("TableName", "T10101")
						.queryParam("Frequency", "Q")
						.queryParam("Year", "X")
						.queryParam("ResultFormat", "JSON")
						.build())
				.retrieve()
				.body(Map.class);
		MetricSourceComparison failure = beaFailure(response, spec);
		if (failure != null) {
			return failure;
		}
		Map<String, Object> datum = latestBeaDatum(response, "1");
		String value = string(datum.get("DataValue")).replace(",", "");
		String period = string(datum.get("TimePeriod"));
		return comparison(
				spec,
				value,
				spec.unit(),
				value,
				spec.unit(),
				period,
				"synced",
				null,
				"BEA GDP line 1 is used as a source verification layer. FRED remains the canonical home value.");
	}

	@SuppressWarnings("unchecked")
	private MetricSourceComparison fetchAlpha(EconomySupplementService.SourceSpec spec) {
		return switch (spec.providerSeriesId()) {
			case "FX_USD_KRW" -> {
				Map<String, Object> response = alphaClient.get()
						.uri(uriBuilder -> uriBuilder
								.path("/query")
								.queryParam("function", "CURRENCY_EXCHANGE_RATE")
								.queryParam("from_currency", "USD")
								.queryParam("to_currency", "KRW")
								.queryParam("apikey", alphaVantageApiKey)
								.build())
						.retrieve()
						.body(Map.class);
				MetricSourceComparison failure = alphaFailure(response, spec);
				if (failure != null) {
					yield failure;
				}
				Map<String, Object> rate = map(response, "Realtime Currency Exchange Rate");
				yield alphaComparison(spec, string(rate.get("5. Exchange Rate")), string(rate.get("6. Last Refreshed")));
			}
			case "SPY_PROXY" -> {
				Map<String, Object> response = alphaClient.get()
						.uri(uriBuilder -> uriBuilder
								.path("/query")
								.queryParam("function", "GLOBAL_QUOTE")
								.queryParam("symbol", "SPY")
								.queryParam("apikey", alphaVantageApiKey)
								.build())
						.retrieve()
						.body(Map.class);
				MetricSourceComparison failure = alphaFailure(response, spec);
				if (failure != null) {
					yield failure;
				}
				Map<String, Object> quote = map(response, "Global Quote");
				yield alphaComparison(spec, string(quote.get("05. price")), string(quote.get("07. latest trading day")));
			}
			default -> fetchAlphaDataList(spec, alphaFunction(spec.providerSeriesId()));
		};
	}

	@SuppressWarnings("unchecked")
	private MetricSourceComparison fetchAlphaDataList(EconomySupplementService.SourceSpec spec, String function) {
		Map<String, Object> response = alphaClient.get()
				.uri(uriBuilder -> {
					var builder = uriBuilder
							.path("/query")
							.queryParam("function", function)
							.queryParam("apikey", alphaVantageApiKey);
					if (spec.providerSeriesId().startsWith("TREASURY_YIELD")) {
						builder.queryParam("interval", "daily");
						builder.queryParam("maturity", spec.providerSeriesId().endsWith("10YEAR") ? "10year" : "2year");
					}
					if ("WTI".equals(function)) {
						builder.queryParam("interval", "daily");
					}
					return builder.build();
				})
				.retrieve()
				.body(Map.class);
		MetricSourceComparison failure = alphaFailure(response, spec);
		if (failure != null) {
			return failure;
		}
		List<Object> data = (List<Object>) response.get("data");
		if (data == null || data.isEmpty()) {
			return failure(spec, "failed", "Alpha Vantage response did not include data.");
		}
		Map<String, Object> first = (Map<String, Object>) data.get(0);
		return alphaComparison(spec, string(first.get("value")), string(first.get("date")));
	}

	private MetricSourceComparison alphaComparison(EconomySupplementService.SourceSpec spec, String value, String baseDate) {
		return comparison(
				spec,
				value,
				spec.unit(),
				"",
				"",
				baseDate,
				"synced",
				null,
				"Alpha Vantage is an auxiliary market-data layer. FRED remains the canonical home value when both are available.");
	}

	private String alphaFunction(String providerSeriesId) {
		return switch (providerSeriesId) {
			case "RETAIL_SALES" -> "RETAIL_SALES";
			case "TREASURY_YIELD_10YEAR", "TREASURY_YIELD_2YEAR" -> "TREASURY_YIELD";
			case "WTI" -> "WTI";
			default -> providerSeriesId;
		};
	}

	private MetricSourceComparison comparison(
			EconomySupplementService.SourceSpec spec,
			String rawValue,
			String rawUnit,
			String normalizedValue,
			String normalizedUnit,
			String baseDate,
			String status,
			String errorMessage,
			String comparisonNote) {
		String displayValue = hasText(normalizedValue) ? normalizedValue : rawValue;
		String displayUnit = hasText(normalizedUnit) ? normalizedUnit : rawUnit;
		return new MetricSourceComparison(
				spec.provider(),
				spec.providerSeriesId(),
				blankToEmpty(displayValue),
				blankToDefault(displayUnit, spec.unit()),
				blankToEmpty(rawValue),
				blankToDefault(rawUnit, spec.unit()),
				blankToEmpty(normalizedValue),
				blankToEmpty(normalizedUnit),
				blankToEmpty(comparisonNote),
				blankToEmpty(baseDate),
				spec.sourceUrl(),
				status,
				errorMessage,
				OffsetDateTime.now().toString());
	}

	private MetricSourceComparison failure(EconomySupplementService.SourceSpec spec, String status, String errorMessage) {
		return comparison(spec, "", spec.unit(), "", "", "", status, errorMessage, "");
	}

	private MetricSourceComparison blsFailure(Map<String, Object> response, EconomySupplementService.SourceSpec spec) {
		String status = string(response == null ? null : response.get("status"));
		if (status.isBlank() || "REQUEST_SUCCEEDED".equalsIgnoreCase(status)) {
			return null;
		}
		String message = messages(response);
		String normalizedMessage = message.toLowerCase(Locale.ROOT);
		if (normalizedMessage.contains("invalid") && normalizedMessage.contains("key")) {
			return failure(spec, "invalid_key", message);
		}
		if (normalizedMessage.contains("denied") || normalizedMessage.contains("403")) {
			return failure(spec, "access_denied", message);
		}
		return failure(spec, "failed", message);
	}

	@SuppressWarnings("unchecked")
	private MetricSourceComparison beaFailure(Map<String, Object> response, EconomySupplementService.SourceSpec spec) {
		Map<String, Object> beaApi = mapOrNull(response, "BEAAPI");
		Map<String, Object> results = mapOrNull(beaApi, "Results");
		Map<String, Object> error = mapOrNull(results, "Error");
		if (error == null) {
			return null;
		}
		String description = string(error.get("APIErrorDescription"));
		String normalized = description.toLowerCase(Locale.ROOT);
		if (normalized.contains("not active") || normalized.contains("inactive")) {
			return failure(spec, "inactive_key", description);
		}
		if (normalized.contains("denied") || normalized.contains("403")) {
			return failure(spec, "access_denied", description);
		}
		return failure(spec, "failed", description);
	}

	private MetricSourceComparison alphaFailure(Map<String, Object> response, EconomySupplementService.SourceSpec spec) {
		String message = firstText(response, "Information", "Note", "Error Message");
		if (message.isBlank()) {
			return null;
		}
		String normalized = message.toLowerCase(Locale.ROOT);
		if (normalized.contains("frequency")
				|| normalized.contains("premium")
				|| normalized.contains("rate limit")
				|| normalized.contains("standard api call")) {
			return failure(spec, "rate_limited", message);
		}
		if (normalized.contains("denied") || normalized.contains("403")) {
			return failure(spec, "access_denied", message);
		}
		return failure(spec, "failed", message);
	}

	private String classifyException(Exception exception) {
		String message = exception.getMessage() == null ? "" : exception.getMessage().toLowerCase(Locale.ROOT);
		if (message.contains("403") || message.contains("forbidden") || message.contains("access denied")) {
			return "access_denied";
		}
		if (message.contains("rate") || message.contains("frequency") || message.contains("premium")) {
			return "rate_limited";
		}
		return "failed";
	}

	private boolean hasProviderKey(String provider) {
		return switch (provider) {
			case "BLS" -> hasText(blsApiKey);
			case "BEA" -> hasText(beaApiKey);
			case "ALPHA_VANTAGE" -> hasText(alphaVantageApiKey);
			default -> false;
		};
	}

	@SuppressWarnings("unchecked")
	private List<Map<String, Object>> blsData(Map<String, Object> response) {
		Map<String, Object> results = map(response, "Results");
		List<Object> series = (List<Object>) results.get("series");
		Map<String, Object> firstSeries = (Map<String, Object>) series.get(0);
		List<Object> data = (List<Object>) firstSeries.get("data");
		return data.stream()
				.map(item -> (Map<String, Object>) item)
				.toList();
	}

	private NormalizedValue normalizeBls(
			String metricId,
			EconomySupplementService.SourceSpec spec,
			List<Map<String, Object>> data,
			Map<String, Object> latest) {
		if (!"cpi".equals(metricId) && !"core-cpi".equals(metricId)) {
			return new NormalizedValue(
					"",
					"",
					"BLS " + spec.providerSeriesId() + " is kept as a raw source check. FRED remains the canonical home value.");
		}
		String year = string(latest.get("year"));
		String period = string(latest.get("period"));
		double latestValue = parseDouble(string(latest.get("value")));
		int previousYear = Integer.parseInt(year) - 1;
		return data.stream()
				.filter(item -> Integer.toString(previousYear).equals(string(item.get("year"))))
				.filter(item -> period.equals(string(item.get("period"))))
				.findFirst()
				.map(previous -> {
					double previousValue = parseDouble(string(previous.get("value")));
					String normalizedValue = String.format(Locale.US, "%.1f", ((latestValue / previousValue) - 1.0) * 100.0);
					return new NormalizedValue(
							normalizedValue,
							"% YoY",
							"FRED CPIAUCSL is requested as units=pc1 (% YoY). BLS " + spec.providerSeriesId()
									+ " is a raw CPI index level, so the raw value can differ; normalizedValue is calculated from the year-ago BLS index.");
				})
				.orElseGet(() -> new NormalizedValue(
						"",
						"",
						"FRED CPIAUCSL is requested as units=pc1 (% YoY). BLS " + spec.providerSeriesId()
								+ " returned a raw index level, and this sync did not include the year-ago point needed for normalization."));
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> latestBeaDatum(Map<String, Object> response, String lineNumber) {
		Map<String, Object> beaApi = map(response, "BEAAPI");
		Map<String, Object> results = map(beaApi, "Results");
		List<Object> data = (List<Object>) results.get("Data");
		return data.stream()
				.map(item -> (Map<String, Object>) item)
				.filter(item -> lineNumber.equals(string(item.get("LineNumber"))))
				.findFirst()
				.orElseThrow(() -> new IllegalStateException("BEA response did not include line " + lineNumber + "."));
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> map(Map<String, Object> source, String key) {
		Object value = source == null ? null : source.get(key);
		if (value instanceof Map<?, ?> item) {
			return (Map<String, Object>) item;
		}
		throw new IllegalStateException("Response did not include " + key + ".");
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> mapOrNull(Map<String, Object> source, String key) {
		Object value = source == null ? null : source.get(key);
		return value instanceof Map<?, ?> item ? (Map<String, Object>) item : null;
	}

	private String blsBaseDate(String year, String period) {
		if (period != null && period.startsWith("M") && period.length() == 3) {
			return year + "-" + period.substring(1);
		}
		return year == null ? "" : year;
	}

	@SuppressWarnings("unchecked")
	private String messages(Map<String, Object> response) {
		Object messages = response == null ? null : response.get("message");
		if (messages instanceof List<?> items) {
			return String.join(" ", items.stream().map(Object::toString).toList());
		}
		return string(messages);
	}

	private String firstText(Map<String, Object> source, String... keys) {
		if (source == null) {
			return "";
		}
		for (String key : keys) {
			String value = string(source.get(key));
			if (!value.isBlank()) {
				return value;
			}
		}
		return "";
	}

	private double parseDouble(String value) {
		return Double.parseDouble(value.replace(",", ""));
	}

	private String string(Object value) {
		return value == null ? "" : value.toString();
	}

	private String blankToEmpty(String value) {
		return value == null ? "" : value;
	}

	private String blankToDefault(String value, String defaultValue) {
		return value == null || value.isBlank() ? defaultValue : value;
	}

	private boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	private record NormalizedValue(String value, String unit, String note) {
	}
}
