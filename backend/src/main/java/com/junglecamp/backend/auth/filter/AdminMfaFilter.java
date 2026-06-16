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
		String uri = request.getRequestURI();
		if (!uri.startsWith("/api/")) {
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
		if (errorCode == null || isAllowedPendingAdminMfaRequest(uri)) {
			filterChain.doFilter(request, response);
			return;
		}
		response.setStatus(uri.startsWith("/api/admin/") ? HttpServletResponse.SC_FORBIDDEN : HttpServletResponse.SC_UNAUTHORIZED);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		objectMapper.writeValue(response.getWriter(), new AuthError(errorCode, "Admin MFA verification is required"));
	}

	private boolean isAllowedPendingAdminMfaRequest(String uri) {
		return uri.equals("/api/logout")
				|| uri.equals("/api/status")
				|| uri.startsWith("/api/auth/mfa/")
				|| uri.equals("/api/auth/signup")
				|| uri.equals("/api/auth/signup/complete")
				|| uri.equals("/api/auth/login")
				|| uri.equals("/api/auth/verify-email")
				|| uri.equals("/api/auth/verify-email-code")
				|| uri.equals("/api/auth/nickname-availability")
				|| uri.equals("/api/auth/resend-verification")
				|| uri.startsWith("/api/internal/agent-tools/")
				|| uri.equals("/api/us-economy/dashboard")
				|| uri.equals("/api/us-economy/data-sources")
				|| uri.equals("/api/us-economy/market-indicators")
				|| (uri.startsWith("/api/us-economy/metrics/") && uri.endsWith("/history"));
	}

	private record AuthError(String errorCode, String message) {
	}
}
