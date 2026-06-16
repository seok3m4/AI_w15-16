package com.junglecamp.backend.economy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AiBrief;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class OpenAiBriefService {

	private static final Logger log = LoggerFactory.getLogger(OpenAiBriefService.class);

	private final RestClient restClient;
	private final ObjectMapper objectMapper;
	private final String apiKey;
	private final String model;

	@Autowired
	public OpenAiBriefService(
			@Value("${app.economy.openai.api-key:}") String apiKey,
			@Value("${app.economy.openai.model:gpt-5.5}") String model) {
		this(RestClient.create("https://api.openai.com"), new ObjectMapper(), apiKey, model);
	}

	OpenAiBriefService(RestClient restClient, ObjectMapper objectMapper, String apiKey, String model) {
		this.restClient = restClient;
		this.objectMapper = objectMapper;
		this.apiKey = apiKey;
		this.model = model;
	}

	public String model() {
		return model;
	}

	public AiBrief generate(List<EconomyMetricSnapshot> metrics, List<EconomicEvent> events) {
		return generate(metrics, events, SupportedLocale.KO);
	}

	public AiBrief generate(List<EconomyMetricSnapshot> metrics, List<EconomicEvent> events, SupportedLocale locale) {
		SupportedLocale resolvedLocale = locale == null ? SupportedLocale.KO : locale;
		if (apiKey == null || apiKey.isBlank()) {
			return RuleBasedBriefFactory.fallback(metrics, events, "fallback:no-openai-key", resolvedLocale);
		}

		try {
			Map<String, Object> body = new LinkedHashMap<>();
			body.put("model", model);
			body.put("input", List.of(
					Map.of(
							"role", "system",
							"content", "You explain verified U.S. economic metrics in " + languageName(resolvedLocale) + ". Never invent numbers. Use only supplied JSON evidence."),
					Map.of(
							"role", "user",
							"content", objectMapper.writeValueAsString(Map.of(
									"metrics", metrics,
									"events", events)))));
			body.put("text", Map.of("format", jsonSchema()));

			String responseBody = restClient.post()
					.uri("/v1/responses")
					.contentType(MediaType.APPLICATION_JSON)
					.header("Authorization", "Bearer " + apiKey)
					.body(body)
					.retrieve()
					.body(String.class);
			JsonNode response = objectMapper.readTree(responseBody);
			String json = extractOutputText(response);
			OpenAiBriefPayload payload = objectMapper.readValue(json, OpenAiBriefPayload.class);

			return new AiBrief(
					payload.summary(),
					payload.statusLabel(),
					payload.evidenceMetricIds(),
					payload.evidenceEventIds(),
					payload.koreaImpact(),
					payload.risks(),
					OffsetDateTime.now().toString(),
					"generated");
		} catch (Exception exception) {
			log.warn("OpenAI economy brief generation failed for model {}: {}", model, exception.getMessage());
			return RuleBasedBriefFactory.fallback(metrics, events, "fallback:openai-error", resolvedLocale);
		}
	}

	private String languageName(SupportedLocale locale) {
		return switch (locale) {
			case EN -> "English";
			case ZH_HANS -> "Simplified Chinese";
			case ZH_HANT -> "Traditional Chinese";
			case JA -> "Japanese";
			case KO -> "Korean";
		};
	}

	private Map<String, Object> jsonSchema() {
		return Map.of(
				"type", "json_schema",
				"name", "economy_brief",
				"strict", true,
				"schema", Map.of(
						"type", "object",
						"additionalProperties", false,
						"required", List.of("summary", "statusLabel", "koreaImpact", "risks", "evidenceMetricIds", "evidenceEventIds"),
						"properties", Map.of(
								"summary", Map.of("type", "string"),
								"statusLabel", Map.of("type", "string"),
								"koreaImpact", Map.of("type", "string"),
								"risks", Map.of("type", "array", "items", Map.of("type", "string")),
								"evidenceMetricIds", Map.of("type", "array", "items", Map.of("type", "string")),
								"evidenceEventIds", Map.of("type", "array", "items", Map.of("type", "string")))));
	}

	private String extractOutputText(JsonNode response) {
		if (response == null) {
			throw new IllegalStateException("OpenAI response was empty");
		}
		JsonNode outputText = response.get("output_text");
		if (outputText != null && outputText.isTextual()) {
			return outputText.asText();
		}
		for (JsonNode output : response.path("output")) {
			for (JsonNode content : output.path("content")) {
				JsonNode text = content.get("text");
				if (text != null && text.isTextual()) {
					return text.asText();
				}
			}
		}
		throw new IllegalStateException("OpenAI response did not contain text output");
	}

	record OpenAiBriefPayload(
			String summary,
			String statusLabel,
			String koreaImpact,
			List<String> risks,
			List<String> evidenceMetricIds,
			List<String> evidenceEventIds) {
	}
}
