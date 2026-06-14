package com.junglecamp.backend.economy;

import com.junglecamp.backend.economy.dto.EconomySupplementDtos;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MetricSourceComparison;
import com.junglecamp.backend.economy.repository.EconomySnapshotRepository;
import com.junglecamp.backend.economy.service.EconomySourceComparisonSyncService;
import com.junglecamp.backend.economy.service.EconomySupplementService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class EconomySourceComparisonSyncServiceTests {

	@Test
	void classifiesBlsInvalidKeyResponse() {
		RestClient.Builder blsBuilder = RestClient.builder().baseUrl("https://api.bls.gov");
		MockRestServiceServer blsServer = MockRestServiceServer.bindTo(blsBuilder).build();
		EconomySourceComparisonSyncService service = service(
				blsBuilder.build(),
				RestClient.create("https://apps.bea.gov"),
				RestClient.create("https://www.alphavantage.co"),
				"bad-bls-key",
				"bea-key",
				"alpha-key");

		blsServer.expect(requestTo("https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0?registrationkey=bad-bls-key"))
				.andRespond(withSuccess("""
						{
						  "status": "REQUEST_NOT_PROCESSED",
						  "message": ["The BLS API key provided is invalid."],
						  "Results": {}
						}
						""", MediaType.APPLICATION_JSON));

		MetricSourceComparison result = service.fetch(
				"cpi",
				new EconomySupplementService.SourceSpec("BLS", "CUUR0000SA0", "index", "https://www.bls.gov/cpi/"));

		assertThat(result.status()).isEqualTo("invalid_key");
		assertThat(result.errorMessage()).contains("invalid");
		blsServer.verify();
	}

	@Test
	void classifiesBeaInactiveUserIdResponse() {
		RestClient.Builder beaBuilder = RestClient.builder().baseUrl("https://apps.bea.gov");
		MockRestServiceServer beaServer = MockRestServiceServer.bindTo(beaBuilder).build();
		EconomySourceComparisonSyncService service = service(
				RestClient.create("https://api.bls.gov"),
				beaBuilder.build(),
				RestClient.create("https://www.alphavantage.co"),
				"bls-key",
				"inactive-bea-key",
				"alpha-key");

		beaServer.expect(requestTo("https://apps.bea.gov/api/data?UserID=inactive-bea-key&method=GetData&datasetname=NIPA&TableName=T10101&Frequency=Q&Year=X&ResultFormat=JSON"))
				.andRespond(withSuccess("""
						{
						  "BEAAPI": {
						    "Results": {
						      "Error": {
						        "APIErrorCode": "4",
						        "APIErrorDescription": "This UserId is not active. Please activate it and try again."
						      }
						    }
						  }
						}
						""", MediaType.APPLICATION_JSON));

		MetricSourceComparison result = service.fetch(
				"gdp-growth",
				new EconomySupplementService.SourceSpec("BEA", "NIPA:T10101:1", "% QoQ annualized", "https://www.bea.gov/data/gdp/gross-domestic-product"));

		assertThat(result.status()).isEqualTo("inactive_key");
		assertThat(result.errorMessage()).contains("not active");
		beaServer.verify();
	}

	@Test
	void classifiesAlphaVantageRateLimitResponse() {
		RestClient.Builder alphaBuilder = RestClient.builder().baseUrl("https://www.alphavantage.co");
		MockRestServiceServer alphaServer = MockRestServiceServer.bindTo(alphaBuilder).build();
		EconomySourceComparisonSyncService service = service(
				RestClient.create("https://api.bls.gov"),
				RestClient.create("https://apps.bea.gov"),
				alphaBuilder.build(),
				"bls-key",
				"bea-key",
				"alpha-key");

		alphaServer.expect(requestTo("https://www.alphavantage.co/query?function=TREASURY_YIELD&apikey=alpha-key&interval=daily&maturity=2year"))
				.andRespond(withSuccess("""
						{
						  "Information": "Thank you for using Alpha Vantage! Our standard API call frequency is limited. Please visit premium options."
						}
						""", MediaType.APPLICATION_JSON));

		MetricSourceComparison result = service.fetch(
				"ust2y",
				new EconomySupplementService.SourceSpec("ALPHA_VANTAGE", "TREASURY_YIELD_2YEAR", "%", "https://www.alphavantage.co/documentation/"));

		assertThat(result.status()).isEqualTo("rate_limited");
		assertThat(result.errorMessage()).contains("standard API call frequency");
		alphaServer.verify();
	}

	private EconomySourceComparisonSyncService service(
			RestClient blsClient,
			RestClient beaClient,
			RestClient alphaClient,
			String blsApiKey,
			String beaApiKey,
			String alphaApiKey) {
		return new EconomySourceComparisonSyncService(
				mock(EconomySnapshotRepository.class),
				blsClient,
				beaClient,
				alphaClient,
				blsApiKey,
				beaApiKey,
				alphaApiKey);
	}
}
