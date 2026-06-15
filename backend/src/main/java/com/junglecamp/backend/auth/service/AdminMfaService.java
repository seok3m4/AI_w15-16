package com.junglecamp.backend.auth.service;

import com.junglecamp.backend.auth.exception.AuthException;
import com.junglecamp.backend.auth.repository.AdminMfaRepository;
import com.junglecamp.backend.auth.support.TokenHashing;
import com.junglecamp.backend.user.model.AppUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminMfaService {

	private final AdminMfaRepository repository;
	private final DataEncryptionService encryptionService;
	private final TotpService totpService;
	private final AdminMfaCookieService cookieService;
	private final boolean enabled;
	private final String issuer;
	private final SecureRandom secureRandom = new SecureRandom();

	public AdminMfaService(
			AdminMfaRepository repository,
			DataEncryptionService encryptionService,
			TotpService totpService,
			AdminMfaCookieService cookieService,
			@Value("${app.auth.admin-mfa.enabled:${AUTH_ADMIN_MFA_ENABLED:true}}") boolean enabled,
			@Value("${app.auth.admin-mfa.issuer:US ECON AI}") String issuer) {
		this.repository = repository;
		this.encryptionService = encryptionService;
		this.totpService = totpService;
		this.cookieService = cookieService;
		this.enabled = enabled;
		this.issuer = issuer;
	}

	public Status status(AppUser user, HttpServletRequest request) {
		boolean required = isRequired(user);
		boolean enrolled = required && repository.find(user.id()).map(AdminMfaRepository.Setting::confirmed).orElse(false);
		boolean verified = !required || (enrolled && cookieService.isVerified(request, user.id()));
		return new Status(required, verified, enrolled);
	}

	public boolean isRequired(AppUser user) {
		return enabled && user != null && user.roles().contains("ROLE_ADMIN");
	}

	public String blockingErrorCode(AppUser user, HttpServletRequest request) {
		if (!isRequired(user)) {
			return null;
		}
		AdminMfaRepository.Setting setting = repository.find(user.id()).orElse(null);
		if (setting == null || !setting.confirmed()) {
			return "admin_mfa_setup_required";
		}
		if (!cookieService.isVerified(request, user.id())) {
			return "admin_mfa_required";
		}
		return null;
	}

	@Transactional
	public SetupResponse setup(AppUser user) {
		ensureAdmin(user);
		String secret = totpService.generateSecret();
		repository.upsertPending(user.id(), encryptionService.encrypt(secret));
		return new SetupResponse(secret, otpauthUri(user, secret));
	}

	@Transactional
	public VerifyResponse confirm(AppUser user, String code, HttpServletResponse response) {
		ensureAdmin(user);
		String secret = secretFor(user);
		if (!totpService.verify(secret, normalizeCode(code))) {
			throw new AuthException(HttpStatus.UNAUTHORIZED, "invalid_mfa_code", "The MFA code is invalid");
		}
		repository.confirm(user.id());
		List<String> recoveryCodes = recoveryCodes();
		repository.replaceRecoveryCodes(user.id(), recoveryCodes.stream()
				.map(TokenHashing::sha256)
				.toList());
		cookieService.write(response, user.id());
		return new VerifyResponse(true, true, true, recoveryCodes);
	}

	@Transactional
	public VerifyResponse verify(AppUser user, String code, String recoveryCode, HttpServletResponse response) {
		ensureAdmin(user);
		AdminMfaRepository.Setting setting = repository.find(user.id())
				.filter(AdminMfaRepository.Setting::confirmed)
				.orElseThrow(() -> new AuthException(HttpStatus.FORBIDDEN, "admin_mfa_setup_required", "Admin MFA setup is required"));
		boolean verified = false;
		if (code != null && !code.isBlank()) {
			verified = totpService.verify(encryptionService.decrypt(setting.secretCiphertext()), normalizeCode(code));
		}
		if (!verified && recoveryCode != null && !recoveryCode.isBlank()) {
			verified = repository.consumeRecoveryCode(user.id(), TokenHashing.sha256(normalizeRecoveryCode(recoveryCode)));
		}
		if (!verified) {
			throw new AuthException(HttpStatus.UNAUTHORIZED, "invalid_mfa_code", "The MFA code is invalid");
		}
		cookieService.write(response, user.id());
		return new VerifyResponse(true, true, true, List.of());
	}

	private void ensureAdmin(AppUser user) {
		if (!isRequired(user)) {
			throw new AuthException(HttpStatus.FORBIDDEN, "admin_mfa_not_required", "Admin MFA is only available for admin accounts");
		}
	}

	private String secretFor(AppUser user) {
		return repository.find(user.id())
				.map(AdminMfaRepository.Setting::secretCiphertext)
				.map(encryptionService::decrypt)
				.orElseThrow(() -> new AuthException(HttpStatus.FORBIDDEN, "admin_mfa_setup_required", "Admin MFA setup is required"));
	}

	private String otpauthUri(AppUser user, String secret) {
		String label = issuer + ":" + (user.email() == null ? user.providerUserId() : user.email());
		return "otpauth://totp/" + url(label)
				+ "?secret=" + url(secret)
				+ "&issuer=" + url(issuer)
				+ "&algorithm=SHA1&digits=6&period=30";
	}

	private List<String> recoveryCodes() {
		List<String> codes = new ArrayList<>();
		for (int index = 0; index < 8; index++) {
			byte[] bytes = new byte[6];
			secureRandom.nextBytes(bytes);
			String raw = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).toUpperCase();
			codes.add(raw.substring(0, 4) + "-" + raw.substring(4, 8));
		}
		return codes;
	}

	private String normalizeCode(String code) {
		return code == null ? "" : code.trim().replace(" ", "");
	}

	private String normalizeRecoveryCode(String recoveryCode) {
		return recoveryCode.trim().toUpperCase().replace(" ", "");
	}

	private String url(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
	}

	public record Status(boolean required, boolean verified, boolean enrolled) {
	}

	public record SetupResponse(String secret, String otpauthUri) {
	}

	public record VerifyResponse(
			boolean adminMfaRequired,
			boolean adminMfaVerified,
			boolean adminMfaEnrolled,
			List<String> recoveryCodes) {
	}
}
