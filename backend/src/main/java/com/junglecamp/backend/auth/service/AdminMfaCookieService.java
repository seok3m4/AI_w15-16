package com.junglecamp.backend.auth.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AdminMfaCookieService {

	public static final String COOKIE_NAME = "ADMIN_MFA";

	private static final String HMAC_ALGORITHM = "HmacSHA256";

	private final byte[] secret;
	private final boolean secureCookie;
	private final Duration ttl;

	public AdminMfaCookieService(
			@Value("${app.auth.jwt.secret:${JWT_SECRET:local-dev-secret-change-me-32-bytes-minimum}}") String secret,
			@Value("${app.auth.jwt.cookie-secure:${JWT_COOKIE_SECURE:false}}") boolean secureCookie,
			@Value("${app.auth.admin-mfa.ttl-seconds:600}") long ttlSeconds) {
		this.secret = secret.getBytes(StandardCharsets.UTF_8);
		this.secureCookie = secureCookie;
		this.ttl = Duration.ofSeconds(Math.max(60, ttlSeconds));
	}

	public void write(HttpServletResponse response, Long userId) {
		Instant expiresAt = Instant.now().plus(ttl);
		String payload = userId + "." + expiresAt.getEpochSecond();
		addCookie(response, token(payload), Math.toIntExact(ttl.toSeconds()));
	}

	public boolean isVerified(HttpServletRequest request, Long userId) {
		String value = cookieValue(request);
		if (value == null || value.isBlank()) {
			return false;
		}
		String[] parts = value.split("\\.");
		if (parts.length != 3) {
			return false;
		}
		String payload = parts[0] + "." + parts[1];
		if (!MessageDigestSafeEquals.equals(parts[2].getBytes(StandardCharsets.UTF_8), sign(payload).getBytes(StandardCharsets.UTF_8))) {
			return false;
		}
		try {
			Long cookieUserId = Long.parseLong(parts[0]);
			long expiresAt = Long.parseLong(parts[1]);
			return cookieUserId.equals(userId) && Instant.now().getEpochSecond() < expiresAt;
		} catch (NumberFormatException exception) {
			return false;
		}
	}

	public void clear(HttpServletResponse response) {
		addCookie(response, "", 0);
	}

	private String token(String payload) {
		return payload + "." + sign(payload);
	}

	private String sign(String payload) {
		try {
			Mac mac = Mac.getInstance(HMAC_ALGORITHM);
			mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
			return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
		} catch (Exception exception) {
			throw new IllegalStateException("Unable to sign admin MFA cookie", exception);
		}
	}

	private void addCookie(HttpServletResponse response, String value, int maxAge) {
		Cookie cookie = new Cookie(COOKIE_NAME, value);
		cookie.setHttpOnly(true);
		cookie.setSecure(secureCookie);
		cookie.setPath("/");
		cookie.setMaxAge(maxAge);
		cookie.setAttribute("SameSite", "Lax");
		response.addCookie(cookie);
	}

	private String cookieValue(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		for (Cookie cookie : cookies) {
			if (COOKIE_NAME.equals(cookie.getName())) {
				return cookie.getValue();
			}
		}
		return null;
	}

	private static final class MessageDigestSafeEquals {

		private MessageDigestSafeEquals() {
		}

		static boolean equals(byte[] left, byte[] right) {
			if (left.length != right.length) {
				return false;
			}
			int result = 0;
			for (int index = 0; index < left.length; index++) {
				result |= left[index] ^ right[index];
			}
			return result == 0;
		}
	}
}
