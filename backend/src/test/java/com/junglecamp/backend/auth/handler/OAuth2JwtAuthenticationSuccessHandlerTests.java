package com.junglecamp.backend.auth.handler;

import com.junglecamp.backend.auth.service.AdminMfaService;
import com.junglecamp.backend.auth.service.AuthCookieService;
import com.junglecamp.backend.auth.service.AuthService;
import com.junglecamp.backend.auth.service.JwtService;
import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.service.AppUserService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OAuth2JwtAuthenticationSuccessHandlerTests {

	@Mock
	private AppUserService appUserService;

	@Mock
	private AuthService authService;

	@Mock
	private AuthCookieService cookieService;

	@Mock
	private AdminMfaService adminMfaService;

	@Mock
	private Authentication authentication;

	@Test
	void oauthSuccessIssuesJwtCookiesBeforeRedirectingToFrontendHome() throws Exception {
		AppUser user = new AppUser(
				7L,
				"google",
				"google-user-7",
				"user@example.com",
				"User",
				null,
				"User",
				Instant.now(),
				List.of("ROLE_USER"),
				null);
		JwtService.TokenIssue tokenIssue = new JwtService.TokenIssue(
				"access-token",
				"refresh-token",
				Instant.now().plusSeconds(3600));
		AuthService.IssuedAuth issuedAuth = new AuthService.IssuedAuth(user, tokenIssue);
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		OAuth2JwtAuthenticationSuccessHandler handler = new OAuth2JwtAuthenticationSuccessHandler(
				appUserService,
				authService,
				cookieService,
				adminMfaService,
				"http://localhost:5173/home",
				"http://localhost:5173");

		when(appUserService.currentUser(authentication)).thenReturn(user);
		when(authService.issueOAuthLogin(user)).thenReturn(issuedAuth);
		when(adminMfaService.status(user, request)).thenReturn(new AdminMfaService.Status(false, true, false));

		handler.onAuthenticationSuccess(request, response, authentication);

		verify(cookieService).writeAuthCookies(response, tokenIssue);
		assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/home");
	}

	@Test
	void oauthSuccessRedirectsAdminToMfaFlowAfterIssuingJwtCookies() throws Exception {
		AppUser admin = new AppUser(
				11L,
				"google",
				"google-admin-11",
				"admin@example.com",
				"Admin",
				null,
				"Admin",
				Instant.now(),
				List.of("ROLE_USER", "ROLE_ADMIN"),
				null);
		JwtService.TokenIssue tokenIssue = new JwtService.TokenIssue(
				"access-token",
				"refresh-token",
				Instant.now().plusSeconds(3600));
		AuthService.IssuedAuth issuedAuth = new AuthService.IssuedAuth(admin, tokenIssue);
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		OAuth2JwtAuthenticationSuccessHandler handler = new OAuth2JwtAuthenticationSuccessHandler(
				appUserService,
				authService,
				cookieService,
				adminMfaService,
				"http://localhost:5173/home",
				"http://localhost:5173/");

		when(appUserService.currentUser(authentication)).thenReturn(admin);
		when(authService.issueOAuthLogin(admin)).thenReturn(issuedAuth);
		when(adminMfaService.status(admin, request)).thenReturn(new AdminMfaService.Status(true, false, true));

		handler.onAuthenticationSuccess(request, response, authentication);

		verify(cookieService).writeAuthCookies(response, tokenIssue);
		assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/auth?mfa=1");
	}
}
