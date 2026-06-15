package com.junglecamp.backend.auth.service;

import com.junglecamp.backend.auth.client.VerificationEmailSender;
import com.junglecamp.backend.auth.dto.AuthDtos.SignupResult;
import com.junglecamp.backend.auth.exception.AuthException;
import com.junglecamp.backend.auth.repository.EmailVerificationTokenRepository;
import com.junglecamp.backend.auth.repository.RefreshTokenRepository;
import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.repository.AppUserRepository;
import com.junglecamp.backend.user.service.AppUserService;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

	private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
	private static final Set<String> BLOCKED_PASSWORD_TERMS = Set.of(
			"password",
			"passwordpassword",
			"passwordpasswordpassword",
			"qwerty",
			"letmein",
			"admin",
			"administrator",
			"useconai",
			"junglecamp",
			"us econ ai",
			"usecon");

	private final AppUserRepository userRepository;
	private final AppUserService userService;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final RefreshTokenRepository refreshTokenRepository;
	private final EmailVerificationTokenRepository emailVerificationTokenRepository;
	private final VerificationEmailSender verificationEmailSender;
	private final String publicBaseUrl;
	private final long verificationTtlMinutes;

	public AuthService(
			AppUserRepository userRepository,
			AppUserService userService,
			PasswordEncoder passwordEncoder,
			JwtService jwtService,
			RefreshTokenRepository refreshTokenRepository,
			EmailVerificationTokenRepository emailVerificationTokenRepository,
			VerificationEmailSender verificationEmailSender,
			@Value("${app.public-base-url:http://localhost:5173}") String publicBaseUrl,
			@Value("${app.auth.email.verification-ttl-minutes:30}") long verificationTtlMinutes) {
		this.userRepository = userRepository;
		this.userService = userService;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.refreshTokenRepository = refreshTokenRepository;
		this.emailVerificationTokenRepository = emailVerificationTokenRepository;
		this.verificationEmailSender = verificationEmailSender;
		this.publicBaseUrl = publicBaseUrl;
		this.verificationTtlMinutes = Math.max(1, verificationTtlMinutes);
	}

	@Transactional(noRollbackFor = AuthException.class)
	public SignupResult signup(
			String email,
			String password,
			String nickname,
			boolean termsAccepted,
			boolean privacyAccepted,
			boolean marketingOptIn) {
		String normalizedEmail = normalizeEmail(email);
		String normalizedNickname = userService.normalizeNickname(nickname);
		validateRequiredConsents(termsAccepted, privacyAccepted);
		validatePassword(password, normalizedEmail, normalizedNickname);
		AppUser user;
		try {
			user = userRepository.createLocalUser(
					normalizedEmail,
					passwordEncoder.encode(password),
					normalizedNickname,
					termsAccepted,
					privacyAccepted,
					marketingOptIn);
		} catch (DuplicateKeyException exception) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email or nickname is already in use");
		}
		sendVerification(user);
		return new SignupResult(user.email(), "verification_required");
	}

	@Transactional
	public IssuedAuth login(String email, String password) {
		AppUserRepository.LocalCredentials credentials = userRepository.findLocalCredentialsByEmail(normalizeEmail(email))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
		if (credentials.passwordHash() == null || !passwordEncoder.matches(password, credentials.passwordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
		}
		AppUser user = userService.applyBootstrapAdminRole(credentials.user());
		ensureCanLogin(user);
		return issue(user);
	}

	@Transactional
	public IssuedAuth refresh(String refreshToken) {
		if (refreshToken == null || refreshToken.isBlank()) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is required");
		}
		JwtService.JwtClaims claims = jwtService.verify(refreshToken, "refresh");
		RefreshTokenRepository.RefreshToken storedToken = refreshTokenRepository.findActive(refreshToken)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is not active"));
		if (!storedToken.userId().equals(claims.userId())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token user mismatch");
		}
		AppUser user = userRepository.findById(claims.userId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User no longer exists"));
		user = userService.applyBootstrapAdminRole(user);
		if (user.suspended()) {
			throw new AuthException(HttpStatus.FORBIDDEN, "account_suspended", "Account is suspended");
		}
		refreshTokenRepository.revoke(refreshToken);
		return issue(user);
	}

	@Transactional
	public void logout(String refreshToken) {
		refreshTokenRepository.revoke(refreshToken);
	}

	@Transactional
	public void verifyEmail(String rawToken) {
		EmailVerificationTokenRepository.EmailVerificationToken token = emailVerificationTokenRepository.findActive(rawToken)
				.orElseThrow(() -> new AuthException(HttpStatus.BAD_REQUEST, "invalid_or_expired_token", "Verification token is invalid or expired"));
		AppUser verified = userRepository.markEmailVerified(token.userId());
		emailVerificationTokenRepository.consume(token.id());
		userService.applyBootstrapAdminRole(verified);
	}

	@Transactional(noRollbackFor = AuthException.class)
	public IssuedAuth verifyEmailCode(String email, String code) {
		AppUser user = userRepository.findByEmail(normalizeEmail(email))
				.filter(candidate -> "local".equals(candidate.provider()))
				.filter(candidate -> !candidate.emailVerified())
				.orElseThrow(this::invalidVerificationCode);
		if (emailVerificationTokenRepository.latestActiveCodeAttemptsExceeded(user.id())) {
			throw new AuthException(
					HttpStatus.BAD_REQUEST,
					"verification_code_attempts_exceeded",
					"Verification code attempts exceeded. Please request a new code.");
		}
		String normalizedCode = code == null ? "" : code.trim();
		return emailVerificationTokenRepository.findActiveByUserAndCode(user.id(), normalizedCode)
				.map(token -> {
					AppUser verified = userRepository.markEmailVerified(token.userId());
					emailVerificationTokenRepository.consume(token.id());
					return issue(userService.applyBootstrapAdminRole(verified));
				})
				.orElseThrow(() -> {
					emailVerificationTokenRepository.incrementLatestActiveCodeAttempt(user.id());
					return invalidVerificationCode();
				});
	}

	@Transactional
	public SignupResult resendVerification(String email) {
		String normalizedEmail = normalizeEmail(email);
		userRepository.findByEmail(normalizedEmail)
				.filter(user -> "local".equals(user.provider()))
				.filter(user -> !user.emailVerified())
				.ifPresent(this::sendVerification);
		return new SignupResult(normalizedEmail, "verification_required");
	}

	private IssuedAuth issue(AppUser user) {
		JwtService.TokenIssue issue = jwtService.issue(user);
		refreshTokenRepository.save(user.id(), issue.refreshToken(), issue.refreshExpiresAt());
		return new IssuedAuth(user, issue);
	}

	private void ensureCanLogin(AppUser user) {
		if (user.suspended()) {
			throw new AuthException(HttpStatus.FORBIDDEN, "account_suspended", "Account is suspended");
		}
		if ("local".equals(user.provider()) && !user.emailVerified()) {
			throw new AuthException(HttpStatus.FORBIDDEN, "email_not_verified", "Email verification is required");
		}
	}

	private void sendVerification(AppUser user) {
		emailVerificationTokenRepository.consumeActiveForUser(user.id());
		EmailVerificationTokenRepository.CreatedVerificationToken verificationToken = emailVerificationTokenRepository.create(
				user.id(),
				Instant.now().plusSeconds(verificationTtlMinutes * 60));
		try {
			verificationEmailSender.sendVerificationEmail(
					user.email(),
					verificationUrl(verificationToken.rawToken()),
					verificationToken.rawCode());
		} catch (RuntimeException exception) {
			throw new AuthException(
					HttpStatus.BAD_GATEWAY,
					"verification_email_send_failed",
					"Verification email could not be sent");
		}
	}

	private String verificationUrl(String rawToken) {
		String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
		return base + "/api/auth/verify-email?token=" + rawToken;
	}

	private AuthException invalidVerificationCode() {
		return new AuthException(
				HttpStatus.BAD_REQUEST,
				"invalid_verification_code",
				"Verification code is invalid or expired");
	}

	private void validateRequiredConsents(boolean termsAccepted, boolean privacyAccepted) {
		if (!termsAccepted || !privacyAccepted) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					"termsAccepted and privacyAccepted are required");
		}
	}

	private String normalizeEmail(String email) {
		if (email == null || email.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
		}
		String normalized = email.trim().toLowerCase(Locale.ROOT);
		if (!EMAIL_PATTERN.matcher(normalized).matches()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is invalid");
		}
		return normalized;
	}

	private void validatePassword(String password, String email, String nickname) {
		if (password == null || password.length() < 15 || password.length() > 64) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					"password must be 15-64 characters");
		}
		if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					"password is too long after encoding");
		}
		String normalized = password.toLowerCase(Locale.ROOT);
		if (BLOCKED_PASSWORD_TERMS.stream().anyMatch(normalized::contains)
				|| containsContext(normalized, email)
				|| containsContext(normalized, nickname)) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					"password is too easy to guess");
		}
	}

	private boolean containsContext(String normalizedPassword, String value) {
		if (value == null || value.isBlank()) {
			return false;
		}
		String normalizedValue = value.trim().toLowerCase(Locale.ROOT);
		if (normalizedValue.length() >= 4 && normalizedPassword.contains(normalizedValue)) {
			return true;
		}
		int at = normalizedValue.indexOf('@');
		String localPart = at > 0 ? normalizedValue.substring(0, at) : normalizedValue;
		return localPart.length() >= 4 && normalizedPassword.contains(localPart);
	}

	public record IssuedAuth(AppUser user, JwtService.TokenIssue tokenIssue) {
	}
}
