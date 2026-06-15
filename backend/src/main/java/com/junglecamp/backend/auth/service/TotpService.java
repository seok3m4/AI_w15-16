package com.junglecamp.backend.auth.service;

import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class TotpService {

	private static final char[] BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();
	private static final int STEP_SECONDS = 30;
	private static final int DIGITS = 6;

	private final SecureRandom secureRandom = new SecureRandom();

	public String generateSecret() {
		byte[] bytes = new byte[20];
		secureRandom.nextBytes(bytes);
		return base32Encode(bytes);
	}

	public String currentCode(String secret) {
		return codeAt(secret, Instant.now());
	}

	public boolean verify(String secret, String code) {
		if (code == null || !code.matches("\\d{6}")) {
			return false;
		}
		long currentStep = Instant.now().getEpochSecond() / STEP_SECONDS;
		for (long step = currentStep - 1; step <= currentStep + 1; step++) {
			if (codeForStep(secret, step).equals(code)) {
				return true;
			}
		}
		return false;
	}

	private String codeAt(String secret, Instant instant) {
		return codeForStep(secret, instant.getEpochSecond() / STEP_SECONDS);
	}

	private String codeForStep(String secret, long step) {
		try {
			Mac mac = Mac.getInstance("HmacSHA1");
			mac.init(new SecretKeySpec(base32Decode(secret), "HmacSHA1"));
			byte[] hash = mac.doFinal(ByteBuffer.allocate(Long.BYTES).putLong(step).array());
			int offset = hash[hash.length - 1] & 0x0f;
			int binary = ((hash[offset] & 0x7f) << 24)
					| ((hash[offset + 1] & 0xff) << 16)
					| ((hash[offset + 2] & 0xff) << 8)
					| (hash[offset + 3] & 0xff);
			int otp = binary % 1_000_000;
			return String.format(Locale.ROOT, "%0" + DIGITS + "d", otp);
		} catch (Exception exception) {
			throw new IllegalArgumentException("Invalid TOTP secret", exception);
		}
	}

	private String base32Encode(byte[] bytes) {
		StringBuilder output = new StringBuilder();
		int buffer = 0;
		int bitsLeft = 0;
		for (byte value : bytes) {
			buffer = (buffer << 8) | (value & 0xff);
			bitsLeft += 8;
			while (bitsLeft >= 5) {
				output.append(BASE32[(buffer >> (bitsLeft - 5)) & 31]);
				bitsLeft -= 5;
			}
		}
		if (bitsLeft > 0) {
			output.append(BASE32[(buffer << (5 - bitsLeft)) & 31]);
		}
		return output.toString();
	}

	private byte[] base32Decode(String value) {
		String normalized = value.replace("=", "").replace(" ", "").toUpperCase(Locale.ROOT);
		ByteBuffer output = ByteBuffer.allocate(normalized.length() * 5 / 8 + 1);
		int buffer = 0;
		int bitsLeft = 0;
		for (char character : normalized.toCharArray()) {
			int index = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(character);
			if (index < 0) {
				throw new IllegalArgumentException("Unsupported Base32 character");
			}
			buffer = (buffer << 5) | index;
			bitsLeft += 5;
			if (bitsLeft >= 8) {
				output.put((byte) ((buffer >> (bitsLeft - 8)) & 0xff));
				bitsLeft -= 8;
			}
		}
		byte[] decoded = new byte[output.position()];
		output.flip();
		output.get(decoded);
		return decoded;
	}
}
