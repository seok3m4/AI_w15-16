package com.junglecamp.backend.auth.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TurnstileCaptchaVerifier implements CaptchaVerifier {

	private static final URI VERIFY_URI = URI.create("https://challenges.cloudflare.com/turnstile/v0/siteverify");

	private final ObjectMapper objectMapper;
	private final HttpClient httpClient;
	private final String secretKey;

	public TurnstileCaptchaVerifier(
			@Value("${app.auth.captcha.turnstile-secret:${TURNSTILE_SECRET_KEY:}}") String secretKey) {
		this.objectMapper = new ObjectMapper();
		this.httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(4))
				.build();
		this.secretKey = secretKey == null ? "" : secretKey.trim();
	}

	@Override
	public boolean verify(String token, String remoteIp) {
		if (secretKey.isBlank() || token == null || token.isBlank()) {
			return false;
		}
		try {
			StringBuilder body = new StringBuilder()
					.append("secret=").append(url(secretKey))
					.append("&response=").append(url(token.trim()));
			if (remoteIp != null && !remoteIp.isBlank()) {
				body.append("&remoteip=").append(url(remoteIp.trim()));
			}
			HttpRequest request = HttpRequest.newBuilder(VERIFY_URI)
					.timeout(Duration.ofSeconds(6))
					.header("Content-Type", "application/x-www-form-urlencoded")
					.POST(HttpRequest.BodyPublishers.ofString(body.toString()))
					.build();
			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() < 200 || response.statusCode() >= 300) {
				return false;
			}
			Map<String, Object> payload = objectMapper.readValue(response.body(), new TypeReference<>() {
			});
			return Boolean.TRUE.equals(payload.get("success"));
		} catch (Exception exception) {
			return false;
		}
	}

	private String url(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}
}
