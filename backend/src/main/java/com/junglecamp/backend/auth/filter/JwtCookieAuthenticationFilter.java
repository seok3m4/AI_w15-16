package com.junglecamp.backend.auth.filter;

import com.junglecamp.backend.auth.service.AuthCookieService;
import com.junglecamp.backend.auth.service.JwtService;
import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.repository.AppUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtCookieAuthenticationFilter extends OncePerRequestFilter {

	private final JwtService jwtService;
	private final AppUserRepository userRepository;

	public JwtCookieAuthenticationFilter(JwtService jwtService, AppUserRepository userRepository) {
		this.jwtService = jwtService;
		this.userRepository = userRepository;
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		if (SecurityContextHolder.getContext().getAuthentication() == null) {
			String accessToken = cookieValue(request, AuthCookieService.ACCESS_COOKIE);
			if (accessToken != null && !accessToken.isBlank()) {
				try {
					JwtService.JwtClaims claims = jwtService.verify(accessToken, "access");
					userRepository.findById(claims.userId()).ifPresent(user -> authenticate(user));
				} catch (RuntimeException ignored) {
					SecurityContextHolder.clearContext();
				}
			}
		}
		filterChain.doFilter(request, response);
	}

	private void authenticate(AppUser user) {
		UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
				user,
				null,
				user.roles().stream()
						.map(SimpleGrantedAuthority::new)
						.toList());
		SecurityContextHolder.getContext().setAuthentication(authentication);
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
