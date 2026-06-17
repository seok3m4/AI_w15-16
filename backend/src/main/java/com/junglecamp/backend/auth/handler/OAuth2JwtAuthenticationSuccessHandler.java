package com.junglecamp.backend.auth.handler;

import com.junglecamp.backend.auth.service.AdminMfaService;
import com.junglecamp.backend.auth.service.AuthCookieService;
import com.junglecamp.backend.auth.service.AuthService;
import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.service.AppUserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Component
public class OAuth2JwtAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

	private final AppUserService appUserService;
	private final AuthService authService;
	private final AuthCookieService cookieService;
	private final AdminMfaService adminMfaService;
	private final String frontendBoardUrl;
	private final String publicBaseUrl;

	public OAuth2JwtAuthenticationSuccessHandler(
			AppUserService appUserService,
			AuthService authService,
			AuthCookieService cookieService,
			AdminMfaService adminMfaService,
			@Value("${app.frontend.board-url:http://localhost:5173/home}") String frontendBoardUrl,
			@Value("${app.public-base-url:http://localhost:5173}") String publicBaseUrl) {
		this.appUserService = appUserService;
		this.authService = authService;
		this.cookieService = cookieService;
		this.adminMfaService = adminMfaService;
		this.frontendBoardUrl = frontendBoardUrl;
		this.publicBaseUrl = publicBaseUrl;
	}

	@Override
	public void onAuthenticationSuccess(
			HttpServletRequest request,
			HttpServletResponse response,
			Authentication authentication) throws IOException, ServletException {
		AppUser user = appUserService.currentUser(authentication);
		AuthService.IssuedAuth issuedAuth = authService.issueOAuthLogin(user);
		cookieService.writeAuthCookies(response, issuedAuth.tokenIssue());
		AdminMfaService.Status status = adminMfaService.status(issuedAuth.user(), request);
		response.sendRedirect(status.required() && !status.verified()
				? frontendAuthUrl("mfa=1")
				: frontendBoardUrl);
	}

	private String frontendAuthUrl(String query) {
		String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
		return base + "/auth?" + query;
	}
}
