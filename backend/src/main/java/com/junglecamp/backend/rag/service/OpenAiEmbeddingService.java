package com.junglecamp.backend.rag.service;

import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class OpenAiEmbeddingService {

	private final RestClient restClient;
	private final String apiKey;
	private final String model;

	@Autowired
	public OpenAiEmbeddingService(
			@Value("${app.economy.openai.api-key:}") String apiKey,
			@Value("${app.rag.embedding-model:text-embedding-3-small}") String model) {
		this(RestClient.create("https://api.openai.com"), apiKey, model);
	}

	OpenAiEmbeddingService(RestClient restClient, String apiKey, String model) {
		this.restClient = restClient;
		this.apiKey = apiKey;
		this.model = model;
	}

	public Optional<String> embedAsVectorLiteral(String input) {
		if (apiKey == null || apiKey.isBlank() || input == null || input.isBlank()) {
			return Optional.empty();
		}

		try {
			EmbeddingResponse response = restClient.post()
					.uri("/v1/embeddings")
					.header("Authorization", "Bearer " + apiKey)
					.body(new EmbeddingRequest(model, input))
					.retrieve()
					.body(EmbeddingResponse.class);
			if (response == null || response.data() == null || response.data().isEmpty()) {
				return Optional.empty();
			}
			return Optional.of(toVectorLiteral(response.data().get(0).embedding()));
		} catch (Exception exception) {
			return Optional.empty();
		}
	}

	private String toVectorLiteral(List<Double> values) {
		if (values == null || values.isEmpty()) {
			return "[]";
		}
		StringBuilder builder = new StringBuilder("[");
		for (int index = 0; index < values.size(); index++) {
			if (index > 0) {
				builder.append(',');
			}
			builder.append(values.get(index));
		}
		return builder.append(']').toString();
	}

	record EmbeddingRequest(String model, String input) {
	}

	record EmbeddingResponse(List<EmbeddingData> data) {
	}

	record EmbeddingData(List<Double> embedding) {
	}
}
