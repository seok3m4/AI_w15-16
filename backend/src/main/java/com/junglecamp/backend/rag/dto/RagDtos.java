package com.junglecamp.backend.rag.dto;

import java.util.List;

public final class RagDtos {

	private RagDtos() {
	}

	public record RagSearchResponse(List<RagSearchResult> results) {
	}

	public record RagSearchResult(
			String id,
			String sourceType,
			String sourceId,
			String title,
			String sourceName,
			String sourceUrl,
			String snippet,
			String observedAt,
			double score) {
	}
}
