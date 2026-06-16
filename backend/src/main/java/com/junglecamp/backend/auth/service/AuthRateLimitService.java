package com.junglecamp.backend.auth.service;

import com.junglecamp.backend.auth.client.CaptchaVerifier;
import com.junglecamp.backend.auth.exception.AuthException;
import com.junglecamp.backend.auth.repository.AuthRateLimitRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthRateLimitService {

	private final AuthRateLimitRepository repository;
	private final CaptchaVerifier captchaVerifier;
	private final boolean enabled;
	private final boolean captchaEnabled;
	private final int signupCaptchaThreshold;
	private final int signupBlockThreshold;
	private final int loginCaptchaThreshold;
	private final int loginBlockThreshold;
	private final int resendCaptchaThreshold;
	private final int resendBlockThreshold;
	private final Duration window;
	private final Duration captchaDuration;
	private final Duration blockDuration;

	public AuthRateLimitService(
			AuthRateLimitRepository repository,
			CaptchaVerifier captchaVerifier,
			@Value("${app.auth.rate-limit.enabled:${AUTH_RATE_LIMIT_ENABLED:true}}") boolean enabled,
			@Value("${app.auth.captcha.enabled:${AUTH_CAPTCHA_ENABLED:true}}") boolean captchaEnabled,
			@Value("${app.auth.rate-limit.signup-captcha-threshold:3}") int signupCaptchaThreshold,
			@Value("${app.auth.rate-limit.signup-block-threshold:8}") int signupBlockThreshold,
			@Value("${app.auth.rate-limit.login-captcha-threshold:3}") int loginCaptchaThreshold,
			@Value("${app.auth.rate-limit.login-block-threshold:6}") int loginBlockThreshold,
			@Value("${app.auth.rate-limit.resend-captcha-threshold:3}") int resendCaptchaThreshold,
			@Value("${app.auth.rate-limit.resend-block-threshold:6}") int resendBlockThreshold,
			@Value("${app.auth.rate-limit.window-seconds:3600}") long windowSeconds,
			@Value("${app.auth.rate-limit.captcha-seconds:900}") long captchaSeconds,
			@Value("${app.auth.rate-limit.block-seconds:900}") long blockSeconds) {
		this.repository = repository;
		this.captchaVerifier = captchaVerifier;
		this.enabled = enabled;
		this.captchaEnabled = captchaEnabled;
		this.signupCaptchaThreshold = Math.max(1, signupCaptchaThreshold);
		this.signupBlockThreshold = Math.max(this.signupCaptchaThreshold + 1, signupBlockThreshold);
		this.loginCaptchaThreshold = Math.max(1, loginCaptchaThreshold);
		this.loginBlockThreshold = Math.max(this.loginCaptchaThreshold + 1, loginBlockThreshold);
		this.resendCaptchaThreshold = Math.max(1, resendCaptchaThreshold);
		this.resendBlockThreshold = Math.max(this.resendCaptchaThreshold + 1, resendBlockThreshold);
		this.window = Duration.ofSeconds(Math.max(60, windowSeconds));
		this.captchaDuration = Duration.ofSeconds(Math.max(60, captchaSeconds));
		this.blockDuration = Duration.ofSeconds(Math.max(60, blockSeconds));
	}

	@Transactional
	public void beforeSignup(String email, String captchaToken, String remoteIp) {
		before("signup", signupKeys(email, remoteIp), captchaToken, remoteIp);
	}

	@Transactional
	public void recordSignupFailure(String email, String remoteIp) {
		recordSignupAttempt(email, remoteIp);
	}

	@Transactional
	public void recordSignupAttempt(String email, String remoteIp) {
		recordFailure("signup", signupKeys(email, remoteIp), signupCaptchaThreshold, signupBlockThreshold);
	}

	@Transactional
	public void resetSignup(String email, String remoteIp) {
		reset(signupKeys(email, remoteIp));
	}

	@Transactional
	public void beforeLogin(String email, String captchaToken, String remoteIp) {
		before("login", loginKeys(email, remoteIp), captchaToken, remoteIp);
	}

	@Transactional
	public void recordLoginFailure(String email, String remoteIp) {
		recordFailure("login", loginKeys(email, remoteIp), loginCaptchaThreshold, loginBlockThreshold);
	}

	@Transactional
	public void resetLogin(String email, String remoteIp) {
		reset(loginKeys(email, remoteIp));
	}

	@Transactional
	public void beforeResend(String email, String captchaToken, String remoteIp) {
		before("resend", resendKeys(email, remoteIp), captchaToken, remoteIp);
	}

	@Transactional
	public void recordResendAttempt(String email, String remoteIp) {
		recordFailure("resend", resendKeys(email, remoteIp), resendCaptchaThreshold, resendBlockThreshold);
	}

	private void before(String action, List<String> keys, String captchaToken, String remoteIp) {
		if (!enabled) {
			return;
		}
		Instant now = Instant.now();
		boolean captchaVerified = false;
		for (String key : keys) {
			AuthRateLimitRepository.Bucket bucket = repository.find(key)
					.filter(candidate -> !windowExpired(candidate, now))
					.orElse(null);
			if (bucket != null) {
				captchaVerified = ensureBucketAllowsRequest(bucket, captchaToken, remoteIp, now, captchaVerified);
			}
		}
	}

	private boolean ensureBucketAllowsRequest(
			AuthRateLimitRepository.Bucket bucket,
			String captchaToken,
			String remoteIp,
			Instant now,
			boolean captchaVerified) {
		if (bucket.blockedUntil() != null && now.isBefore(bucket.blockedUntil())) {
			long retryAfter = Math.max(1, Duration.between(now, bucket.blockedUntil()).toSeconds());
			throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "auth_rate_limited", "Too many authentication attempts", retryAfter);
		}
		if (captchaEnabled
				&& bucket.captchaRequiredUntil() != null
				&& now.isBefore(bucket.captchaRequiredUntil())
				&& !captchaVerified) {
			if (!captchaVerifier.verify(captchaToken, remoteIp)) {
				throw new AuthException(HttpStatus.FORBIDDEN, "captcha_required", "CAPTCHA verification is required for this request");
			}
			return true;
		}
		return captchaVerified;
	}

	private void recordFailure(String action, List<String> keys, int captchaThreshold, int blockThreshold) {
		if (!enabled) {
			return;
		}
		Instant now = Instant.now();
		for (String key : keys) {
			AuthRateLimitRepository.Bucket previous = repository.find(key)
					.filter(bucket -> !windowExpired(bucket, now))
					.orElse(new AuthRateLimitRepository.Bucket(key, action, 0, now, null, null));
			int count = previous.attemptCount() + 1;
			Instant captchaUntil = count >= captchaThreshold ? now.plus(captchaDuration) : previous.captchaRequiredUntil();
			Instant blockedUntil = count >= blockThreshold ? now.plus(blockDuration) : previous.blockedUntil();
			repository.save(new AuthRateLimitRepository.Bucket(
					key,
					action,
					count,
					previous.windowStartedAt(),
					blockedUntil,
					captchaUntil));
		}
	}

	private void reset(List<String> keys) {
		if (!enabled) {
			return;
		}
		for (String key : keys) {
			repository.delete(key);
		}
	}

	private boolean windowExpired(AuthRateLimitRepository.Bucket bucket, Instant now) {
		return bucket.windowStartedAt().plus(window).isBefore(now);
	}

	private List<String> signupKeys(String email, String remoteIp) {
		return List.of("signup:ip:" + ip(remoteIp), "signup:email:" + email(email));
	}

	private List<String> loginKeys(String email, String remoteIp) {
		return List.of("login:ip:" + ip(remoteIp), "login:email:" + email(email));
	}

	private List<String> resendKeys(String email, String remoteIp) {
		return List.of("resend:ip:" + ip(remoteIp), "resend:email:" + email(email));
	}

	private String email(String email) {
		return email == null || email.isBlank() ? "blank" : email.trim().toLowerCase(Locale.ROOT);
	}

	private String ip(String remoteIp) {
		return remoteIp == null || remoteIp.isBlank() ? "unknown" : remoteIp.trim();
	}
}
