package com.memento.feature.auth;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
class DefaultEmailProtector implements EmailProtector {

    private static final int GCM_TAG_BITS = 128;
    private static final int NONCE_BYTES = 12;

    private final byte[] emailEncryptionKey;
    private final String emailEncryptionKeyId;
    private final byte[] emailLookupPepper;
    private final SecureRandom secureRandom = new SecureRandom();

    DefaultEmailProtector(
            @Value("${memento.auth.email-encryption-key-base64}") String emailEncryptionKeyBase64,
            @Value("${memento.auth.email-encryption-key-id}") String emailEncryptionKeyId,
            @Value("${memento.auth.email-lookup-pepper-base64}") String emailLookupPepperBase64) {
        this.emailEncryptionKey = Base64.getDecoder().decode(emailEncryptionKeyBase64);
        this.emailEncryptionKeyId = emailEncryptionKeyId;
        this.emailLookupPepper = Base64.getDecoder().decode(emailLookupPepperBase64);
        if (emailEncryptionKey.length != 32) {
            throw new IllegalArgumentException("Email encryption key must be 32 bytes.");
        }
    }

    @Override
    public ProtectedEmail protect(String normalizedEmail) {
        byte[] nonce = new byte[NONCE_BYTES];
        secureRandom.nextBytes(nonce);
        return new ProtectedEmail(
                encrypt(normalizedEmail, nonce),
                nonce,
                emailEncryptionKeyId,
                lookupHash(normalizedEmail));
    }

    private byte[] encrypt(String normalizedEmail, byte[] nonce) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                    Cipher.ENCRYPT_MODE,
                    new SecretKeySpec(emailEncryptionKey, "AES"),
                    new GCMParameterSpec(GCM_TAG_BITS, nonce));
            return cipher.doFinal(normalizedEmail.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Failed to protect email.", exception);
        }
    }

    private byte[] lookupHash(String normalizedEmail) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(emailLookupPepper, "HmacSHA256"));
            return mac.doFinal(normalizedEmail.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Failed to hash email lookup key.", exception);
        }
    }
}
