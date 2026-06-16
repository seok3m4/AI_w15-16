package com.junglecamp.backend.auth.service;

import com.junglecamp.backend.auth.client.VerificationEmailSender;
import com.junglecamp.backend.auth.dto.AuthDtos.EmailVerificationResult;
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
	private static final Pattern UPPERCASE_PATTERN = Pattern.compile("\\p{Lu}");
	private static final Pattern SPECIAL_CHARACTER_PATTERN = Pattern.compile("[^\\p{L}\\p{N}\\s]");
	private static final int MIN_PASSWORD_LENGTH = 12;
	private static final int MAX_PASSWORD_LENGTH = 64;
	private static final int BCRYPT_MAX_PASSWORD_BYTES = 72;
	private static final String PASSWORD_POLICY_MESSAGE =
			"password must be 12-64 characters and include an uppercase letter and a special character";
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
	public SignupResult signup(String email) {
		String normalizedEmail = normalizeEmail(email);
		AppUser user;
		try {
			AppUserRepository.LocalCredentials localCredentials = userRepository.findLocalCredentialsByEmail(normalizedEmail)
					.orElse(null);
			if (localCredentials != null && localCredentials.passwordHash() != null) {
				throw emailAlreadyRegistered();
			}
			if (userRepository.findByProviderAndEmail("google", normalizedEmail).isPresent()) {
				throw new AuthException(
						HttpStatus.CONFLICT,
						"email_registered_with_google",
						"이미 Google로 가입된 이메일입니다. Google로 계속해 주세요.");
			}
			user = localCredentials == null ? null : localCredentials.user();
			if (user == null) {
				user = userRepository.createPendingLocalUser(normalizedEmail);
			}
		} catch (DuplicateKeyException exception) {
			throw emailAlreadyRegistered();
		}
		Instant expiresAt = sendVerification(user);
		return new SignupResult(user.email(), "verification_required", expiresAt);
	}

	@Transactional
	public IssuedAuth completeSignup(
			String email,
			String password,
			String nickname,
			boolean termsAccepted,
			boolean privacyAccepted,
			boolean marketingOptIn) {
		String normalizedEmail = normalizeEmail(email);
		AppUserRepository.LocalCredentials credentials = userRepository.findLocalCredentialsByEmail(normalizedEmail)
				.orElseThrow(() -> new AuthException(HttpStatus.FORBIDDEN, "email_not_verified", "Email verification is required"));
		if (credentials.passwordHash() != null) {
			throw emailAlreadyRegistered();
		}
		if (!credentials.user().emailVerified()) {
			throw new AuthException(HttpStatus.FORBIDDEN, "email_not_verified", "Email verification is required");
		}
		String normalizedNickname = userService.normalizeNickname(nickname);
		validateRequiredConsents(termsAccepted, privacyAccepted);
		validatePassword(password, normalizedEmail, normalizedNickname);
		try {
			AppUser user = userRepository.completeLocalSignup(
					credentials.user().id(),
					passwordEncoder.encode(password),
					normalizedNickname,
					termsAccepted,
					privacyAccepted,
					marketingOptIn);
			return issue(userService.applyBootstrapAdminRole(user));
		} catch (DuplicateKeyException exception) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email or nickname is already in use");
		}
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
	public EmailVerificationResult verifyEmailCode(String email, String code) {
		String normalizedEmail = normalizeEmail(email);
		AppUserRepository.LocalCredentials credentials = userRepository.findLocalCredentialsByEmail(normalizedEmail)
				.orElseThrow(this::invalidVerificationCode);
		AppUser user = credentials.user();
		if (emailVerificationTokenRepository.latestActiveCodeAttemptsExceeded(user.id())) {
			throw new AuthException(
					HttpStatus.BAD_REQUEST,
					"verification_code_attempts_exceeded",
					"Verification code attempts exceeded. Please request a new code.");
		}
		String normalizedCode = code == null ? "" : code.trim();
		return emailVerificationTokenRepository.findLatestActiveByUserAndCode(user.id(), normalizedCode)
				.map(token -> {
					AppUser verified = userRepository.markEmailVerified(token.userId());
					emailVerificationTokenRepository.consume(token.id());
					userService.applyBootstrapAdminRole(verified);
					return new EmailVerificationResult(verified.email(), "email_verified");
				})
				.orElseThrow(() -> {
					emailVerificationTokenRepository.incrementLatestActiveCodeAttempt(user.id());
					return invalidVerificationCode();
				});
	}

	@Transactional
	public SignupResult resendVerification(String email) {
		String normalizedEmail = normalizeEmail(email);
		Instant expiresAt = userRepository.findByEmail(normalizedEmail)
				.filter(user -> "local".equals(user.provider()))
				.filter(user -> !user.emailVerified())
				.map(this::sendVerification)
				.orElseGet(this::nextVerificationExpiry);
		return new SignupResult(normalizedEmail, "verification_required", expiresAt);
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

	private Instant sendVerification(AppUser user) {
		emailVerificationTokenRepository.consumeActiveForUser(user.id());
		Instant expiresAt = nextVerificationExpiry();
		EmailVerificationTokenRepository.CreatedVerificationToken verificationToken = emailVerificationTokenRepository.create(
				user.id(),
				expiresAt);
		try {
			verificationEmailSender.sendVerificationEmail(
					user.email(),
					verificationUrl(verificationToken.rawToken()),
					verificationToken.rawCode());
			return expiresAt;
		} catch (RuntimeException exception) {
			throw new AuthException(
					HttpStatus.BAD_GATEWAY,
					"verification_email_send_failed",
					"Verification email could not be sent");
		}
	}

	private Instant nextVerificationExpiry() {
		return Instant.now().plusSeconds(verificationTtlMinutes * 60);
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

	private AuthException emailAlreadyRegistered() {
		return new AuthException(
				HttpStatus.CONFLICT,
				"email_already_registered",
				"이미 등록된 이메일입니다.");
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
		if (password == null || password.length() < MIN_PASSWORD_LENGTH || password.length() > MAX_PASSWORD_LENGTH) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					PASSWORD_POLICY_MESSAGE);
		}
		if (password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_PASSWORD_BYTES) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					"password is too long after encoding");
		}
		if (!UPPERCASE_PATTERN.matcher(password).find() || !SPECIAL_CHARACTER_PATTERN.matcher(password).find()) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST,
					PASSWORD_POLICY_MESSAGE);
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
