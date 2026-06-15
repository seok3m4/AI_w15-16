package com.junglecamp.backend.auth.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.junglecamp.backend.auth.service.AdminMfaService;
import com.junglecamp.backend.user.dto.UserDtos.CurrentUser;
import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.service.AppUserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.ServletException;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AdminMfaFilter extends OncePerRequestFilter {

	private final AppUserService appUserService;
	private final AdminMfaService adminMfaService;
	private final ObjectMapper objectMapper;

	public AdminMfaFilter(AppUserService appUserService, AdminMfaService adminMfaService) {
		this.appUserService = appUserService;
		this.adminMfaService = adminMfaService;
		this.objectMapper = new ObjectMapper();
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		if (!request.getRequestURI().startsWith("/api/admin/")) {
			filterChain.doFilter(request, response);
			return;
		}
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
			filterChain.doFilter(request, response);
			return;
		}
		AppUser user = appUserService.currentUser(authentication);
		String errorCode = adminMfaService.blockingErrorCode(user, request);
		if (errorCode == null) {
			filterChain.doFilter(request, response);
			return;
		}
		response.setStatus(HttpServletResponse.SC_FORBIDDEN);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		objectMapper.writeValue(response.getWriter(), new AuthError(errorCode, "Admin MFA verification is required"));
	}

	private record AuthError(String errorCode, String message) {
	}
}
