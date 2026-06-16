package com.junglecamp.backend.search.controller;

import com.junglecamp.backend.i18n.LocaleResolver;
import com.junglecamp.backend.search.dto.HomeSearchDtos.HomeSearchResponse;
import com.junglecamp.backend.search.service.HomeSearchService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class HomeSearchController {

	private final HomeSearchService homeSearchService;
	private final LocaleResolver localeResolver;

	public HomeSearchController(HomeSearchService homeSearchService, LocaleResolver localeResolver) {
		this.homeSearchService = homeSearchService;
		this.localeResolver = localeResolver;
	}

	@GetMapping("/home")
	public HomeSearchResponse homeSearch(
			@RequestParam(name = "query", required = false) String query,
			@RequestParam(name = "locale", required = false) String locale,
			@RequestHeader(name = "Accept-Language", required = false) String acceptLanguage,
			Authentication authentication) {
		return homeSearchService.search(query, localeResolver.resolve(locale, acceptLanguage), authentication);
	}
}
