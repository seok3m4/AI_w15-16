package com.memento.feature.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
class HmacJwtTokenService implements JwtTokenService {

    private final byte[] signingKey;
    private final long accessTokenTtlSeconds;
    private final ObjectMapper objectMapper = new ObjectMapper();

    HmacJwtTokenService(
            @Value("${memento.auth.jwt-signing-key}") String signingKey,
            @Value("${memento.auth.access-token-ttl-seconds:3600}") long accessTokenTtlSeconds) {
        this.signingKey = signingKey.getBytes(StandardCharsets.UTF_8);
        this.accessTokenTtlSeconds = accessTokenTtlSeconds;
    }

    @Override
    public String createAccessToken(UUID userId, Instant issuedAt) {
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        long issuedAtEpoch = issuedAt.getEpochSecond();
        long expiresAtEpoch = issuedAtEpoch + accessTokenTtlSeconds;
        String payload = """
                {"sub":"%s","type":"access","iat":%d,"exp":%d}
                """.formatted(userId, issuedAtEpoch, expiresAtEpoch).trim();
        String unsignedToken = encode(header.getBytes(StandardCharsets.UTF_8))
                + "."
                + encode(payload.getBytes(StandardCharsets.UTF_8));
        return unsignedToken + "." + encode(sign(unsignedToken));
    }

    @Override
    public Optional<AccessTokenClaims> verifyAccessToken(String token, Instant now) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String[] parts = token.split("\\.", -1);
        if (parts.length != 3) {
            return Optional.empty();
        }

        String unsignedToken = parts[0] + "." + parts[1];
        byte[] expectedSignature = sign(unsignedToken);
        byte[] actualSignature;
        try {
            actualSignature = Base64.getUrlDecoder().decode(parts[2]);
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
        if (!MessageDigest.isEqual(expectedSignature, actualSignature)) {
            return Optional.empty();
        }

        try {
            JsonNode payload = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            if (!"access".equals(payload.path("type").asText())) {
                return Optional.empty();
            }
            if (payload.path("exp").asLong(0) <= now.getEpochSecond()) {
                return Optional.empty();
            }
            return Optional.of(new AccessTokenClaims(UUID.fromString(payload.path("sub").asText())));
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    @Override
    public long accessTokenExpiresInSeconds() {
        return accessTokenTtlSeconds;
    }

    private byte[] sign(String unsignedToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
            return mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to sign JWT.", exception);
        }
    }

    private String encode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
