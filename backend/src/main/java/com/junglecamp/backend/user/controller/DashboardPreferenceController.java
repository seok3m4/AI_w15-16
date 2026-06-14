package com.junglecamp.backend.user.controller;

import com.junglecamp.backend.user.model.DashboardPreferences;
import com.junglecamp.backend.user.service.DashboardPreferenceService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/dashboard-preferences")
public class DashboardPreferenceController {

	private final DashboardPreferenceService preferenceService;

	public DashboardPreferenceController(DashboardPreferenceService preferenceService) {
		this.preferenceService = preferenceService;
	}

	@GetMapping
	public DashboardPreferences get(Authentication authentication) {
		return preferenceService.findForCurrentUser(authentication);
	}

	@PutMapping
	public DashboardPreferences save(Authentication authentication, @RequestBody DashboardPreferences preferences) {
		return preferenceService.saveForCurrentUser(authentication, preferences);
	}
}
