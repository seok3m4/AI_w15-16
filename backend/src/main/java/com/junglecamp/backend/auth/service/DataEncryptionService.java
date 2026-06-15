package com.junglecamp.backend.auth.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class DataEncryptionService {

	private static final String ALGORITHM = "AES/GCM/NoPadding";
	private static final int IV_BYTES = 12;
	private static final int TAG_BITS = 128;

	private final SecretKeySpec key;
	private final SecureRandom secureRandom = new SecureRandom();

	public DataEncryptionService(
			@Value("${app.data.encryption-key:${APP_DATA_ENCRYPTION_KEY:local-dev-data-encryption-key-change-me}}") String rawKey) {
		this.key = new SecretKeySpec(sha256(rawKey == null ? "" : rawKey), "AES");
	}

	public String encrypt(String plaintext) {
		try {
			byte[] iv = new byte[IV_BYTES];
			secureRandom.nextBytes(iv);
			Cipher cipher = Cipher.getInstance(ALGORITHM);
			cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
			byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
			ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
			buffer.put(iv);
			buffer.put(encrypted);
			return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer.array());
		} catch (Exception exception) {
			throw new IllegalStateException("Unable to encrypt protected data", exception);
		}
	}

	public String decrypt(String ciphertext) {
		try {
			byte[] payload = Base64.getUrlDecoder().decode(ciphertext);
			ByteBuffer buffer = ByteBuffer.wrap(payload);
			byte[] iv = new byte[IV_BYTES];
			buffer.get(iv);
			byte[] encrypted = new byte[buffer.remaining()];
			buffer.get(encrypted);
			Cipher cipher = Cipher.getInstance(ALGORITHM);
			cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
			return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
		} catch (Exception exception) {
			throw new IllegalStateException("Unable to decrypt protected data", exception);
		}
	}

	private byte[] sha256(String value) {
		try {
			return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
		} catch (Exception exception) {
			throw new IllegalStateException("Unable to derive encryption key", exception);
		}
	}
}
