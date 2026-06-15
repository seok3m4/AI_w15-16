package com.junglecamp.backend.auth.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthCookieService {

	public static final String ACCESS_COOKIE = "ACCESS_TOKEN";
	public static final String REFRESH_COOKIE = "REFRESH_TOKEN";
	public static final String XSRF_COOKIE = "XSRF-TOKEN";

	private final JwtService jwtService;
	private final boolean secureCookie;
	private final SecureRandom secureRandom = new SecureRandom();

	public AuthCookieService(
			JwtService jwtService,
			@Value("${app.auth.jwt.cookie-secure:${JWT_COOKIE_SECURE:false}}") boolean secureCookie) {
		this.jwtService = jwtService;
		this.secureCookie = secureCookie;
	}

	public void writeAuthCookies(HttpServletResponse response, JwtService.TokenIssue issue) {
		addCookie(response, ACCESS_COOKIE, issue.accessToken(), true, Math.toIntExact(jwtService.accessTtlSeconds()));
		addCookie(response, REFRESH_COOKIE, issue.refreshToken(), true, Math.toIntExact(jwtService.refreshTtlSeconds()));
		addCookie(response, XSRF_COOKIE, randomXsrfToken(), false, Math.toIntExact(jwtService.accessTtlSeconds()));
	}

	public void clearAuthCookies(HttpServletResponse response) {
		addCookie(response, ACCESS_COOKIE, "", true, 0);
		addCookie(response, REFRESH_COOKIE, "", true, 0);
		addCookie(response, XSRF_COOKIE, "", false, 0);
	}

	private void addCookie(HttpServletResponse response, String name, String value, boolean httpOnly, int maxAge) {
		Cookie cookie = new Cookie(name, value);
		cookie.setHttpOnly(httpOnly);
		cookie.setSecure(secureCookie);
		cookie.setPath("/");
		cookie.setMaxAge(maxAge);
		cookie.setAttribute("SameSite", "Lax");
		response.addCookie(cookie);
	}

	private String randomXsrfToken() {
		byte[] bytes = new byte[24];
		secureRandom.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}
}
