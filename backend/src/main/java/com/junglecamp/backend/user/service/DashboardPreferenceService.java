package com.junglecamp.backend.user.service;

import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.model.DashboardPreferences;
import com.junglecamp.backend.user.repository.DashboardPreferenceRepository;
import com.junglecamp.backend.user.service.AppUserService;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DashboardPreferenceService {

	private final AppUserService appUserService;
	private final DashboardPreferenceRepository repository;

	public DashboardPreferenceService(AppUserService appUserService, DashboardPreferenceRepository repository) {
		this.appUserService = appUserService;
		this.repository = repository;
	}

	public DashboardPreferences findForCurrentUser(Authentication authentication) {
		AppUser user = appUserService.currentUser(authentication);
		return repository.findByUserId(user.id()).orElseGet(DashboardPreferences::defaults);
	}

	public DashboardPreferences saveForCurrentUser(Authentication authentication, DashboardPreferences request) {
		AppUser user = appUserService.currentUser(authentication);
		DashboardPreferences preferences = sanitize(request == null ? DashboardPreferences.defaults() : request);
		repository.save(user.id(), preferences);
		return preferences;
	}

	private DashboardPreferences sanitize(DashboardPreferences request) {
		List<String> visibleSections = uniqueTrimmed(request.visibleSections());
		Set<String> allowedSections = Set.copyOf(DashboardPreferences.ALLOWED_VISIBLE_SECTIONS);
		for (String section : visibleSections) {
			if (!allowedSections.contains(section)) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown dashboard section: " + section);
			}
		}
		if (visibleSections.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one dashboard section is required");
		}

		return new DashboardPreferences(
				uniqueTrimmed(request.coreMetricIds()),
				uniqueTrimmed(request.watchMetricIds()),
				uniqueTrimmed(request.eventIds()),
				uniqueTrimmed(request.reportIds()),
				visibleSections);
	}

	private List<String> uniqueTrimmed(List<String> values) {
		LinkedHashSet<String> cleaned = new LinkedHashSet<>();
		for (String value : values == null ? List.<String>of() : values) {
			if (value != null && !value.isBlank()) {
				cleaned.add(value.trim());
			}
		}
		return List.copyOf(cleaned);
	}
}
