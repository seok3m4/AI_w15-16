package com.memento.feature.mcp;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class McpTokenService {

    private static final String TOKEN_PREFIX = "mmt_mcp_";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final McpConnectionRepository repository;
    private final HmacMcpTokenHasher tokenHasher;
    private final Clock clock;

    McpTokenService(
            McpConnectionRepository repository,
            HmacMcpTokenHasher tokenHasher,
            Clock clock) {
        this.repository = repository;
        this.tokenHasher = tokenHasher;
        this.clock = clock;
    }

    @Transactional
    McpCredentialCreateResponse createServerCredential(UUID ownerId, McpCredentialCreateRequest request) {
        String name = normalizeName(request.name());
        List<String> scopes = McpScopes.normalize(request.scopes());
        Instant now = clock.instant();
        Instant expiresAt = parseExpiresAt(request.expiresAt(), now);
        String rawToken = newRawToken();
        McpConnectionRecord record = repository.saveServerCredential(new McpConnectionSecretInput(
                ownerId,
                name,
                McpScopes.toConfigJson(scopes),
                tokenHasher.hash(rawToken),
                "hash:mcp_token",
                expiresAt,
                now));
        return new McpCredentialCreateResponse(
                record.id(),
                record.name(),
                record.provider(),
                record.status(),
                scopes,
                rawToken,
                record.createdAt(),
                record.expiresAt());
    }

    @Transactional(readOnly = true)
    Optional<McpCredentialContext> resolve(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        return repository.findActiveServerBySecretHash(tokenHasher.hash(rawToken.trim()))
                .filter(record -> "active".equals(record.status()))
                .filter(record -> record.expiresAt() == null || record.expiresAt().isAfter(clock.instant()))
                .map(record -> new McpCredentialContext(
                        record.id(),
                        record.ownerId(),
                        record.name(),
                        McpScopes.fromConfigJson(record.configJson())));
    }

    @Transactional
    void revoke(UUID ownerId, UUID connectionId) {
        repository.revoke(ownerId, connectionId, clock.instant());
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new McpInvalidRequestException("name must not be blank.");
        }
        String normalized = name.trim();
        if (normalized.length() > 100) {
            throw new McpInvalidRequestException("name must be at most 100 characters.");
        }
        return normalized;
    }

    private Instant parseExpiresAt(String expiresAt, Instant now) {
        if (expiresAt == null || expiresAt.isBlank()) {
            return now.plus(30, ChronoUnit.DAYS);
        }
        try {
            Instant parsed = Instant.parse(expiresAt);
            if (!parsed.isAfter(now)) {
                throw new McpInvalidRequestException("expiresAt must be in the future.");
            }
            return parsed;
        } catch (McpInvalidRequestException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new McpInvalidRequestException("expiresAt must be an ISO-8601 instant.");
        }
    }

    private String newRawToken() {
        byte[] random = new byte[32];
        SECURE_RANDOM.nextBytes(random);
        return TOKEN_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(random);
    }
}

