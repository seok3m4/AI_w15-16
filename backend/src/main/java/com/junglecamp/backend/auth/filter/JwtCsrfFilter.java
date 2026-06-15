package com.junglecamp.backend.auth.filter;

import com.junglecamp.backend.auth.service.AuthCookieService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.Set;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtCsrfFilter extends OncePerRequestFilter {

	private static final Set<String> SAFE_METHODS = Set.of(
			HttpMethod.GET.name(),
			HttpMethod.HEAD.name(),
			HttpMethod.OPTIONS.name(),
			HttpMethod.TRACE.name());

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		if (requiresCsrf(request) && !hasValidXsrfPair(request)) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN, "XSRF token is required for JWT cookie requests.");
			return;
		}
		filterChain.doFilter(request, response);
	}

	private boolean requiresCsrf(HttpServletRequest request) {
		if (SAFE_METHODS.contains(request.getMethod())) {
			return false;
		}
		String path = request.getRequestURI();
		if (path.startsWith("/api/auth/") || "/api/logout".equals(path)) {
			return false;
		}
		return hasCookie(request, AuthCookieService.ACCESS_COOKIE);
	}

	private boolean hasValidXsrfPair(HttpServletRequest request) {
		String cookieValue = cookieValue(request, AuthCookieService.XSRF_COOKIE);
		String headerValue = request.getHeader("X-XSRF-TOKEN");
		return cookieValue != null && !cookieValue.isBlank() && cookieValue.equals(headerValue);
	}

	private boolean hasCookie(HttpServletRequest request, String name) {
		return cookieValue(request, name) != null;
	}

	private String cookieValue(HttpServletRequest request, String name) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		for (Cookie cookie : cookies) {
			if (name.equals(cookie.getName())) {
				return cookie.getValue();
			}
		}
		return null;
	}
}
