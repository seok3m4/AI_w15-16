package com.junglecamp.backend.search.service;

import com.junglecamp.backend.board.dto.BoardPostDtos.PostSummary;
import com.junglecamp.backend.board.service.BoardPostService;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ReportItem;
import com.junglecamp.backend.economy.service.EconomySupplementService;
import com.junglecamp.backend.i18n.SupportedLocale;
import com.junglecamp.backend.search.dto.HomeSearchDtos.HomeSearchResponse;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class HomeSearchService {

	private static final int SECTION_LIMIT = 4;
	private static final int DISCUSSION_CANDIDATE_LIMIT = 50;

	private final BoardPostService boardPostService;
	private final EconomySupplementService economySupplementService;

	public HomeSearchService(
			BoardPostService boardPostService,
			EconomySupplementService economySupplementService) {
		this.boardPostService = boardPostService;
		this.economySupplementService = economySupplementService;
	}

	public HomeSearchResponse search(String query, SupportedLocale locale, Authentication authentication) {
		String normalizedQuery = normalize(query);
		if (normalizedQuery == null) {
			return new HomeSearchResponse("", List.of(), List.of(), List.of());
		}

		List<String> terms = terms(normalizedQuery);
		return new HomeSearchResponse(
				normalizedQuery,
				discussions(normalizedQuery, terms, authentication),
				events(normalizedQuery, terms, locale),
				reports(normalizedQuery, terms, locale));
	}

	private List<PostSummary> discussions(String query, List<String> terms, Authentication authentication) {
		return boardPostService.search("", null, null, "latest", 0, DISCUSSION_CANDIDATE_LIMIT, authentication)
				.items()
				.stream()
				.map(item -> new Scored<>(item, scoreDiscussion(item, query, terms)))
				.filter(item -> item.score() > 0)
				.sorted(Comparator
						.<Scored<PostSummary>>comparingInt(Scored::score)
						.reversed()
						.thenComparing(item -> item.item().createdAt(), Comparator.reverseOrder()))
				.limit(SECTION_LIMIT)
				.map(Scored::item)
				.toList();
	}

	private List<EconomicEvent> events(String query, List<String> terms, SupportedLocale locale) {
		return economySupplementService.events(null, null, null, null, null, null, locale)
				.items()
				.stream()
				.map(item -> new Scored<>(item, scoreEvent(item, query, terms)))
				.filter(item -> item.score() > 0)
				.sorted(Comparator
						.<Scored<EconomicEvent>>comparingInt(Scored::score)
						.reversed()
						.thenComparing(item -> item.item().releaseDateTime()))
				.limit(SECTION_LIMIT)
				.map(Scored::item)
				.toList();
	}

	private List<ReportItem> reports(String query, List<String> terms, SupportedLocale locale) {
		return economySupplementService.reports(null, null, locale)
				.items()
				.stream()
				.map(item -> new Scored<>(item, scoreReport(item, query, terms)))
				.filter(item -> item.score() > 0)
				.sorted(Comparator.<Scored<ReportItem>>comparingInt(Scored::score).reversed())
				.limit(SECTION_LIMIT)
				.map(Scored::item)
				.toList();
	}

	private int scoreDiscussion(PostSummary item, String query, List<String> terms) {
		return scoreText(
				query,
				terms,
				item.title(),
				item.excerpt(),
				item.category(),
				String.join(" ", item.tags()));
	}

	private int scoreEvent(EconomicEvent item, String query, List<String> terms) {
		return scoreText(
				query,
				terms,
				item.title(),
				item.interpretation(),
				item.eventCategory(),
				item.sourceName(),
				item.sourceType(),
				String.join(" ", item.relatedMetricIds()));
	}

	private int scoreReport(ReportItem item, String query, List<String> terms) {
		return scoreText(
				query,
				terms,
				item.title(),
				item.summary(),
				item.koreaImplication(),
				item.category(),
				item.sourceName(),
				String.join(" ", item.relatedMetricIds()));
	}

	private int scoreText(String query, List<String> terms, String title, String... fields) {
		int score = 0;
		String normalizedTitle = text(title);
		if (normalizedTitle.equals(query)) {
			score += 120;
		}
		if (normalizedTitle.contains(query)) {
			score += 80;
		}

		StringBuilder searchable = new StringBuilder(normalizedTitle);
		for (String field : fields) {
			searchable.append(' ').append(text(field));
		}
		String searchableText = searchable.toString();
		if (searchableText.contains(query)) {
			score += 30;
		}
		for (String term : terms) {
			if (normalizedTitle.contains(term)) {
				score += 20;
			}
			if (searchableText.contains(term)) {
				score += 6;
			}
		}
		return score;
	}

	private List<String> terms(String normalizedQuery) {
		List<String> terms = new ArrayList<>();
		for (String term : normalizedQuery.split("\\s+")) {
			if (term.length() >= 2) {
				terms.add(term);
			}
		}
		if (terms.isEmpty()) {
			terms.add(normalizedQuery);
		}
		return terms;
	}

	private String normalize(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim().toLowerCase(Locale.ROOT);
	}

	private String text(String value) {
		return value == null ? "" : value.toLowerCase(Locale.ROOT);
	}

	private record Scored<T>(T item, int score) {
	}
}
