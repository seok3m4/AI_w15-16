package com.junglecamp.backend.economy.client;

import com.junglecamp.backend.economy.definition.MetricDefinition;
import com.junglecamp.backend.economy.mapper.FredObservationMapper;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.model.FredObservation;
import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class FredSeriesClient {

	private final RestClient restClient;
	private final FredObservationMapper mapper;
	private final String apiKey;

	@Autowired
	public FredSeriesClient(
			FredObservationMapper mapper,
			@Value("${app.economy.fred.api-key:}") String apiKey) {
		this(RestClient.create("https://api.stlouisfed.org"), mapper, apiKey);
	}

	FredSeriesClient(RestClient restClient, FredObservationMapper mapper, String apiKey) {
		this.restClient = restClient;
		this.mapper = mapper;
		this.apiKey = apiKey;
	}

	public EconomyMetricSnapshot fetchLatest(MetricDefinition definition) {
		if (apiKey == null || apiKey.isBlank()) {
			throw new IllegalStateException("FRED_API_KEY is not configured");
		}

		FredObservationsResponse response = restClient.get()
				.uri(uriBuilder -> uriBuilder
						.path("/fred/series/observations")
						.queryParam("series_id", definition.seriesId())
						.queryParam("api_key", apiKey)
						.queryParam("file_type", "json")
						.queryParam("sort_order", "desc")
						.queryParam("limit", 8)
						.queryParam("units", definition.fredUnits())
						.build())
				.retrieve()
				.body(FredObservationsResponse.class);

		List<FredObservation> observations = response == null ? List.of() : response.observations();
		return mapper.toSnapshot(definition, observations);
	}

	public List<FredObservation> fetchHistory(MetricDefinition definition, LocalDate observationStart) {
		if (apiKey == null || apiKey.isBlank()) {
			throw new IllegalStateException("FRED_API_KEY is not configured");
		}

		FredObservationsResponse response = restClient.get()
				.uri(uriBuilder -> uriBuilder
						.path("/fred/series/observations")
						.queryParam("series_id", definition.seriesId())
						.queryParam("api_key", apiKey)
						.queryParam("file_type", "json")
						.queryParam("sort_order", "asc")
						.queryParam("observation_start", observationStart)
						.queryParam("limit", 5000)
						.queryParam("units", definition.fredUnits())
						.build())
				.retrieve()
				.body(FredObservationsResponse.class);

		return response == null ? List.of() : response.observations();
	}

	record FredObservationsResponse(List<FredObservation> observations) {
	}
}
