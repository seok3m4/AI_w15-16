package com.memento.feature.mcp;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class McpTokenServiceTest {

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-06-17T05:00:00Z"), ZoneOffset.UTC);

    private final RecordingMcpConnectionRepository repository = new RecordingMcpConnectionRepository();
    private final McpTokenService service =
            new McpTokenService(repository, new HmacMcpTokenHasher("local-mcp-pepper"), CLOCK);

    @Test
    void createTokenStoresOnlyHashAndReturnsRawTokenOnce() {
        UUID ownerId = UUID.fromString("11111111-1111-1111-1111-111111111111");

        McpCredentialCreateResponse response = service.createServerCredential(
                ownerId,
                new McpCredentialCreateRequest("Claude Desktop", List.of("memory:read"), null));

        assertThat(response.oneTimeToken()).startsWith("mmt_mcp_");
        assertThat(repository.saved.secretHash()).isNotEmpty();
        assertThat(repository.saved.configJson()).contains("memory:read");
        assertThat(repository.saved.configJson()).doesNotContain(response.oneTimeToken());
    }

    @Test
    void resolveTokenReturnsEmptyForDisabledConnection() {
        repository.record = Optional.of(new McpConnectionRecord(
                UUID.fromString("22222222-2222-2222-2222-222222222222"),
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "Claude Desktop",
                "server",
                "server",
                "{\"scopes\":[\"memory:read\"]}",
                "secret",
                "disabled",
                null,
                CLOCK.instant(),
                CLOCK.instant()));

        assertThat(service.resolve("mmt_mcp_token")).isEmpty();
    }

    private static final class RecordingMcpConnectionRepository implements McpConnectionRepository {

        private McpConnectionSecretInput saved;
        private Optional<McpConnectionRecord> record = Optional.empty();

        @Override
        public McpConnectionRecord saveServerCredential(McpConnectionSecretInput input) {
            this.saved = input;
            return new McpConnectionRecord(
                    UUID.fromString("22222222-2222-2222-2222-222222222222"),
                    input.ownerId(),
                    input.name(),
                    "server",
                    "server",
                    input.configJson(),
                    input.secretRef(),
                    "active",
                    input.expiresAt(),
                    input.now(),
                    input.now());
        }

        @Override
        public Optional<McpConnectionRecord> findActiveServerBySecretHash(byte[] secretHash) {
            return record;
        }

        @Override
        public void revoke(UUID ownerId, UUID connectionId, Instant now) {
        }
    }
}
