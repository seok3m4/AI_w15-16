package com.junglecamp.backend.config;

import com.junglecamp.backend.auth.filter.AdminMfaFilter;
import com.junglecamp.backend.auth.filter.JwtCookieAuthenticationFilter;
import com.junglecamp.backend.auth.filter.JwtCsrfFilter;
import com.junglecamp.backend.auth.service.AdminMfaCookieService;
import com.junglecamp.backend.auth.service.AdminMfaService;
import com.junglecamp.backend.auth.service.AuthCookieService;
import com.junglecamp.backend.auth.service.AuthService;
import com.junglecamp.backend.user.service.AppUserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import org.springframework.security.config.Customizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

	@Bean
	@Order(1)
	SecurityFilterChain apiSecurityFilterChain(
			HttpSecurity http,
			JwtCookieAuthenticationFilter jwtCookieAuthenticationFilter,
			AdminMfaFilter adminMfaFilter,
			JwtCsrfFilter jwtCsrfFilter,
			AuthCookieService authCookieService,
			AdminMfaCookieService adminMfaCookieService,
			AuthService authService) throws Exception {
		return http
				.securityMatcher("/api/**")
				.cors(Customizer.withDefaults())
				.csrf(csrf -> csrf.ignoringRequestMatchers("/api/**"))
				.authorizeHttpRequests(authorize -> authorize
						.requestMatchers("/api/status").permitAll()
						.requestMatchers(
								"/api/auth/signup",
								"/api/auth/signup/complete",
								"/api/auth/login",
								"/api/auth/refresh",
								"/api/auth/verify-email",
								"/api/auth/verify-email-code",
								"/api/auth/nickname-availability",
								"/api/auth/resend-verification").permitAll()
						.requestMatchers("/api/internal/agent-tools/**").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/us-economy/dashboard").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/us-economy/metrics/*/history").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/us-economy/data-sources").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/us-economy/market-indicators").permitAll()
						.requestMatchers("/api/admin/**").hasRole("ADMIN")
				.anyRequest().authenticated())
				.addFilterBefore(jwtCookieAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterAfter(adminMfaFilter, JwtCookieAuthenticationFilter.class)
				.addFilterAfter(jwtCsrfFilter, AdminMfaFilter.class)
				.exceptionHandling(exception -> exception
						.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
				.logout(logout -> logout
						.logoutUrl("/api/logout")
						.permitAll()
						.logoutSuccessHandler((request, response, authentication) -> {
							authService.logout(cookieValue(request.getCookies(), AuthCookieService.REFRESH_COOKIE));
							authCookieService.clearAuthCookies(response);
							adminMfaCookieService.clear(response);
							response.setStatus(HttpStatus.NO_CONTENT.value());
						}))
				.build();
	}

	@Bean
	@Order(2)
	SecurityFilterChain webSecurityFilterChain(
			HttpSecurity http,
			@Value("${app.frontend.board-url:http://localhost:5173/home}") String frontendBoardUrl,
			@Value("${app.public-base-url:http://localhost:5173}") String publicBaseUrl,
			OAuth2UserService<OAuth2UserRequest, OAuth2User> oauth2UserService,
			AppUserService appUserService,
			AdminMfaService adminMfaService) throws Exception {
		return http
				.authorizeHttpRequests(authorize -> authorize
						.requestMatchers(
								"/login",
								"/oauth2/**",
								"/login/oauth2/**",
								"/css/**",
								"/favicon.ico",
								"/v3/api-docs/**",
								"/swagger-ui.html",
								"/swagger-ui/**").permitAll()
						.anyRequest().authenticated())
				.formLogin(form -> form
						.loginPage("/login")
						.successHandler((request, response, authentication) -> response.sendRedirect(
								frontendSuccessUrl(frontendBoardUrl, publicBaseUrl, authentication, request, appUserService, adminMfaService)))
						.permitAll())
				.oauth2Login(oauth2 -> oauth2
						.loginPage("/login")
						.successHandler((request, response, authentication) -> response.sendRedirect(
								frontendSuccessUrl(frontendBoardUrl, publicBaseUrl, authentication, request, appUserService, adminMfaService)))
						.failureHandler((request, response, exception) -> response.sendRedirect(oauthFailureUrl(publicBaseUrl, exception)))
						.userInfoEndpoint(userInfo -> userInfo.userService(oauth2UserService)))
				.logout(logout -> logout
						.logoutSuccessUrl("/login?logout")
						.permitAll())
				.build();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(
			@Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}") String allowedOrigins) {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(parseCsv(allowedOrigins));
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("Accept", "Authorization", "Content-Type", "X-XSRF-TOKEN"));
		configuration.setAllowCredentials(true);
		configuration.setMaxAge(3600L);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/api/**", configuration);
		return source;
	}

	@Bean
	UserDetailsService userDetailsService(PasswordEncoder passwordEncoder) {
		UserDetails user = User.withUsername("user")
				.password(passwordEncoder.encode("password"))
				.roles("USER")
				.build();

		return new InMemoryUserDetailsManager(user);
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	private List<String> parseCsv(String value) {
		return Arrays.stream(value.split(","))
				.map(String::trim)
				.filter(item -> !item.isBlank())
				.toList();
	}

	private String frontendSuccessUrl(
			String frontendBoardUrl,
			String publicBaseUrl,
			Authentication authentication,
			HttpServletRequest request,
			AppUserService appUserService,
			AdminMfaService adminMfaService) {
		try {
			var user = appUserService.currentUser(authentication);
			AdminMfaService.Status status = adminMfaService.status(user, request);
			if (status.required() && !status.verified()) {
				return frontendAuthUrl(publicBaseUrl, "mfa=1");
			}
		} catch (RuntimeException ignored) {
			// Keep OAuth/form login usable even if local profile lookup fails.
		}
		return frontendBoardUrl;
	}

	private String oauthFailureUrl(String publicBaseUrl, Exception exception) {
		String errorCode = "oauth_failed";
		if (exception instanceof OAuth2AuthenticationException oauthException
				&& oauthException.getError() != null
				&& oauthException.getError().getErrorCode() != null
				&& !oauthException.getError().getErrorCode().isBlank()) {
			errorCode = oauthException.getError().getErrorCode();
		}
		String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
		return base + "/auth?oauthError=" + URLEncoder.encode(errorCode, StandardCharsets.UTF_8);
	}

	private String frontendAuthUrl(String publicBaseUrl, String query) {
		String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
		return base + "/auth?" + query;
	}

	private String cookieValue(Cookie[] cookies, String name) {
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
