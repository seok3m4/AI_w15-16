package com.memento.feature.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class DefaultEmailProtectorTest {

    @Test
    void protectProducesStableLookupHashAndNonPlaintextCiphertextForNormalizedEmail() {
        byte[] aesKey = "0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8);
        byte[] lookupPepper = "local-lookup-pepper".getBytes(StandardCharsets.UTF_8);
        DefaultEmailProtector protector = new DefaultEmailProtector(
                Base64.getEncoder().encodeToString(aesKey),
                "local-dev-key",
                Base64.getEncoder().encodeToString(lookupPepper));

        ProtectedEmail first = protector.protect("user@example.com");
        ProtectedEmail second = protector.protect("user@example.com");

        assertThat(first.emailLookupHash()).isEqualTo(second.emailLookupHash());
        assertThat(first.emailCiphertext())
                .isNotEqualTo("user@example.com".getBytes(StandardCharsets.UTF_8));
        assertThat(protector.unprotect(first.emailCiphertext(), first.emailNonce()))
                .isEqualTo("user@example.com");
        assertThat(first.emailNonce()).hasSize(12);
        assertThat(first.emailKeyId()).isEqualTo("local-dev-key");
    }
}
