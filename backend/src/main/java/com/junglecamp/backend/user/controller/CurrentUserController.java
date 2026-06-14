package com.junglecamp.backend.user.controller;

import com.junglecamp.backend.user.dto.UserDtos.CurrentUser;
import com.junglecamp.backend.user.dto.UserDtos.ProfileRequest;
import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.service.AppUserService;
import com.junglecamp.backend.user.service.CurrentUserProfileService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CurrentUserController {

	private final AppUserService appUserService;
	private final CurrentUserProfileService currentUserProfileService;

	public CurrentUserController(AppUserService appUserService, CurrentUserProfileService currentUserProfileService) {
		this.appUserService = appUserService;
		this.currentUserProfileService = currentUserProfileService;
	}

	@GetMapping("/me")
	public CurrentUser me(Authentication authentication, HttpServletRequest request) {
		AppUser user = appUserService.currentUser(authentication);
		return currentUserProfileService.toCurrentUser(user, request);
	}

	@PutMapping("/users/me/profile")
	public CurrentUser updateProfile(
			Authentication authentication,
			HttpServletRequest servletRequest,
			@RequestBody ProfileRequest request) {
		AppUser user = appUserService.updateNickname(authentication, request.nickname());
		return currentUserProfileService.toCurrentUser(user, servletRequest);
	}
}
