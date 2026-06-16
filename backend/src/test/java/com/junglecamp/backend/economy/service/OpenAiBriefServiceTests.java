package com.junglecamp.backend.economy.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AiBrief;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenAiBriefServiceTests {

	@Test
	void generateParsesOpenAiResponseBodyFromText() {
		RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com");
		MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
		OpenAiBriefService service = new OpenAiBriefService(
				builder.build(),
				new ObjectMapper(),
				"test-api-key",
				"gpt-test");

		server.expect(requestTo("https://api.openai.com/v1/responses"))
				.andExpect(method(HttpMethod.POST))
				.andExpect(header("Authorization", "Bearer test-api-key"))
				.andRespond(withSuccess("""
						{
						  "output_text": "{\\"summary\\":\\"Generated summary\\",\\"statusLabel\\":\\"Generated status\\",\\"koreaImpact\\":\\"Generated Korea impact\\",\\"risks\\":[\\"Risk one\\"],\\"evidenceMetricIds\\":[\\"cpi\\"],\\"evidenceEventIds\\":[]}"
						}
						""", MediaType.APPLICATION_JSON));

		AiBrief brief = service.generate(List.of(metric()), List.of(), SupportedLocale.KO);

		assertThat(brief.generationStatus()).isEqualTo("generated");
		assertThat(brief.summary()).isEqualTo("Generated summary");
		assertThat(brief.statusLabel()).isEqualTo("Generated status");
		assertThat(brief.koreaImpact()).isEqualTo("Generated Korea impact");
		assertThat(brief.evidenceMetricIds()).containsExactly("cpi");
		server.verify();
	}

	private EconomyMetricSnapshot metric() {
		return new EconomyMetricSnapshot(
				"cpi",
				"CPIAUCSL",
				"CPI",
				"Prices",
				"3.4",
				"% YoY",
				"2026-05",
				"2026-05",
				"FRED",
				"https://fred.stlouisfed.org/series/CPIAUCSL",
				"3.3",
				"+0.1",
				"+0.1%",
				"Inflation gauge.",
				OffsetDateTime.parse("2026-06-15T00:00:00Z").toString());
	}
}
