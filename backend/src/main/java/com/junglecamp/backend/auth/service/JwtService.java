package com.junglecamp.backend.auth.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.junglecamp.backend.user.model.AppUser;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class JwtService {

	private static final String HMAC_ALGORITHM = "HmacSHA256";
	private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
	private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

	private final ObjectMapper objectMapper;
	private final byte[] secret;
	private final long accessTtlSeconds;
	private final long refreshTtlSeconds;

	public JwtService(
			@Value("${app.auth.jwt.secret:${JWT_SECRET:local-dev-secret-change-me-32-bytes-minimum}}") String secret,
			@Value("${app.auth.jwt.access-ttl-seconds:${JWT_ACCESS_TTL_SECONDS:900}}") long accessTtlSeconds,
			@Value("${app.auth.jwt.refresh-ttl-seconds:${JWT_REFRESH_TTL_SECONDS:1209600}}") long refreshTtlSeconds) {
		this.objectMapper = new ObjectMapper();
		this.secret = secret.getBytes(StandardCharsets.UTF_8);
		this.accessTtlSeconds = accessTtlSeconds;
		this.refreshTtlSeconds = refreshTtlSeconds;
	}

	public TokenIssue issue(AppUser user) {
		return new TokenIssue(
				createToken(user, "access", accessTtlSeconds),
				createToken(user, "refresh", refreshTtlSeconds),
				Instant.now().plusSeconds(refreshTtlSeconds));
	}

	public JwtClaims verify(String token, String expectedType) {
		try {
			String[] parts = token.split("\\.");
			if (parts.length != 3) {
				throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token shape");
			}
			String signedPayload = parts[0] + "." + parts[1];
			if (!constantTimeEquals(parts[2], sign(signedPayload))) {
				throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token signature");
			}
			Map<String, Object> payload = objectMapper.readValue(
					BASE64_URL_DECODER.decode(parts[1]),
					new TypeReference<>() {
					});
			String type = string(payload.get("type"));
			if (!expectedType.equals(type)) {
				throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token type");
			}
			long expiresAt = longValue(payload.get("exp"));
			if (Instant.now().getEpochSecond() >= expiresAt) {
				throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token expired");
			}
			return new JwtClaims(
					longValue(payload.get("uid")),
					string(payload.get("sub")),
					string(payload.get("email")),
					string(payload.get("provider")),
					type,
					Instant.ofEpochSecond(expiresAt));
		} catch (ResponseStatusException exception) {
			throw exception;
		} catch (Exception exception) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token", exception);
		}
	}

	private String createToken(AppUser user, String type, long ttlSeconds) {
		try {
			Instant now = Instant.now();
			Map<String, Object> header = new LinkedHashMap<>();
			header.put("alg", "HS256");
			header.put("typ", "JWT");
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("sub", user.providerUserId());
			payload.put("uid", user.id());
			payload.put("email", user.email());
			payload.put("provider", user.provider());
			payload.put("roles", user.roles());
			payload.put("type", type);
			payload.put("jti", UUID.randomUUID().toString());
			payload.put("iat", now.getEpochSecond());
			payload.put("exp", now.plusSeconds(ttlSeconds).getEpochSecond());
			String signedPayload = encodeJson(header) + "." + encodeJson(payload);
			return signedPayload + "." + sign(signedPayload);
		} catch (Exception exception) {
			throw new IllegalStateException("Unable to create JWT.", exception);
		}
	}

	private String encodeJson(Map<String, Object> value) throws Exception {
		return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
	}

	private String sign(String value) throws Exception {
		Mac mac = Mac.getInstance(HMAC_ALGORITHM);
		mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
		return BASE64_URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
	}

	private boolean constantTimeEquals(String left, String right) {
		return MessageDigestSafeEquals.equals(left.getBytes(StandardCharsets.UTF_8), right.getBytes(StandardCharsets.UTF_8));
	}

	private String string(Object value) {
		return value == null ? "" : value.toString();
	}

	private long longValue(Object value) {
		if (value instanceof Number number) {
			return number.longValue();
		}
		return Long.parseLong(string(value));
	}

	public long accessTtlSeconds() {
		return accessTtlSeconds;
	}

	public long refreshTtlSeconds() {
		return refreshTtlSeconds;
	}

	public record TokenIssue(String accessToken, String refreshToken, Instant refreshExpiresAt) {
	}

	public record JwtClaims(
			Long userId,
			String subject,
			String email,
			String provider,
			String type,
			Instant expiresAt) {
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
