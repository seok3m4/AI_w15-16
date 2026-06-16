package com.memento.feature.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthTokenServiceTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-06-15T03:10:00Z"), ZoneOffset.UTC);

    @Test
    void createsSignedJwtAccessTokenWithSubjectAndExpiry() {
        HmacJwtTokenService service = new HmacJwtTokenService(
                "local-dev-only-change-me",
                3600);

        String token = service.createAccessToken(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                CLOCK.instant());

        String[] parts = token.split("\\.");
        assertThat(parts).hasSize(3);
        String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
        assertThat(payload).contains("\"sub\":\"11111111-1111-1111-1111-111111111111\"");
        assertThat(payload).contains("\"type\":\"access\"");
        assertThat(payload).contains("\"exp\":1781496600");
    }

    @Test
    void hashesRefreshTokenWithPepper() {
        HmacRefreshTokenHasher hasher = new HmacRefreshTokenHasher("refresh-pepper");

        byte[] hash = hasher.hash("refresh-token");

        assertThat(hash).hasSize(32);
        assertThat(hash).isNotEqualTo("refresh-token".getBytes());
    }
}
