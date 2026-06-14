package com.junglecamp.backend.user.service;

import com.junglecamp.backend.auth.service.AdminMfaService;
import com.junglecamp.backend.user.dto.UserDtos.CurrentUser;
import com.junglecamp.backend.user.model.AppUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserProfileService {

	private final AppUserService appUserService;
	private final AdminMfaService adminMfaService;

	public CurrentUserProfileService(AppUserService appUserService, AdminMfaService adminMfaService) {
		this.appUserService = appUserService;
		this.adminMfaService = adminMfaService;
	}

	public CurrentUser toCurrentUser(AppUser user, HttpServletRequest request) {
		String displayNickname = appUserService.displayNickname(user);
		AdminMfaService.Status mfaStatus = adminMfaService.status(user, request);
		return new CurrentUser(
				user.id(),
				user.email() == null ? user.providerUserId() : user.email(),
				user.email(),
				user.displayName(),
				user.avatarUrl(),
				user.provider(),
				user.nickname(),
				displayNickname,
				user.roles(),
				user.emailVerified(),
				user.suspended(),
				mfaStatus.required(),
				mfaStatus.verified(),
				mfaStatus.enrolled());
	}
}
