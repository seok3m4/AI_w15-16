package com.junglecamp.backend.auth.controller;

import com.junglecamp.backend.auth.dto.AuthDtos.AuthErrorResponse;
import com.junglecamp.backend.auth.dto.AuthDtos.EmailVerificationResult;
import com.junglecamp.backend.auth.dto.AuthDtos.LoginRequest;
import com.junglecamp.backend.auth.dto.AuthDtos.ResendVerificationRequest;
import com.junglecamp.backend.auth.dto.AuthDtos.SignupCompleteRequest;
import com.junglecamp.backend.auth.dto.AuthDtos.SignupRequest;
import com.junglecamp.backend.auth.dto.AuthDtos.SignupResult;
import com.junglecamp.backend.auth.dto.AuthDtos.TotpConfirmRequest;
import com.junglecamp.backend.auth.dto.AuthDtos.TotpVerifyRequest;
import com.junglecamp.backend.auth.dto.AuthDtos.VerifyEmailCodeRequest;
import com.junglecamp.backend.auth.exception.AuthException;
import com.junglecamp.backend.auth.service.AdminMfaService;
import com.junglecamp.backend.auth.service.AuthCookieService;
import com.junglecamp.backend.auth.service.AuthRateLimitService;
import com.junglecamp.backend.auth.service.AuthService;
import com.junglecamp.backend.user.dto.UserDtos.CurrentUser;
import com.junglecamp.backend.user.dto.UserDtos.NicknameAvailability;
import com.junglecamp.backend.user.service.AppUserService;
import com.junglecamp.backend.user.service.CurrentUserProfileService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final AuthCookieService cookieService;
	private final AuthRateLimitService rateLimitService;
	private final AdminMfaService adminMfaService;
	private final AppUserService appUserService;
	private final CurrentUserProfileService currentUserProfileService;
	private final String publicBaseUrl;

	public AuthController(
			AuthService authService,
			AuthCookieService cookieService,
			AuthRateLimitService rateLimitService,
			AdminMfaService adminMfaService,
			AppUserService appUserService,
			CurrentUserProfileService currentUserProfileService,
			@Value("${app.public-base-url:http://localhost:5173}") String publicBaseUrl) {
		this.authService = authService;
		this.cookieService = cookieService;
		this.rateLimitService = rateLimitService;
		this.adminMfaService = adminMfaService;
		this.appUserService = appUserService;
		this.currentUserProfileService = currentUserProfileService;
		this.publicBaseUrl = publicBaseUrl;
	}

	@PostMapping("/signup")
	@ResponseStatus(HttpStatus.ACCEPTED)
	public SignupResult signup(@RequestBody SignupRequest request, HttpServletRequest servletRequest) {
		String remoteIp = clientIp(servletRequest);
		rateLimitService.beforeSignup(request.email(), request.captchaToken(), remoteIp);
		try {
			SignupResult result = authService.signup(request.email());
			rateLimitService.recordSignupAttempt(request.email(), remoteIp);
			return result;
		} catch (RuntimeException exception) {
			rateLimitService.recordSignupFailure(request.email(), remoteIp);
			throw exception;
		}
	}

	@PostMapping("/signup/complete")
	public CurrentUser completeSignup(
			@RequestBody SignupCompleteRequest request,
			HttpServletRequest servletRequest,
			HttpServletResponse response) {
		AuthService.IssuedAuth issuedAuth = authService.completeSignup(
				request.email(),
				request.password(),
				request.nickname(),
				Boolean.TRUE.equals(request.termsAccepted()),
				Boolean.TRUE.equals(request.privacyAccepted()),
				Boolean.TRUE.equals(request.marketingOptIn()));
		cookieService.writeAuthCookies(response, issuedAuth.tokenIssue());
		return currentUserProfileService.toCurrentUser(issuedAuth.user(), servletRequest);
	}

	@GetMapping("/nickname-availability")
	public NicknameAvailability nicknameAvailability(@RequestParam("nickname") String nickname) {
		return appUserService.nicknameAvailability(nickname);
	}

	@PostMapping("/login")
	public CurrentUser login(
			@RequestBody LoginRequest request,
			HttpServletRequest servletRequest,
			HttpServletResponse response) {
		String remoteIp = clientIp(servletRequest);
		rateLimitService.beforeLogin(request.email(), request.captchaToken(), remoteIp);
		try {
			AuthService.IssuedAuth issuedAuth = authService.login(request.email(), request.password());
			rateLimitService.resetLogin(request.email(), remoteIp);
			cookieService.writeAuthCookies(response, issuedAuth.tokenIssue());
			return currentUserProfileService.toCurrentUser(issuedAuth.user(), servletRequest);
		} catch (RuntimeException exception) {
			rateLimitService.recordLoginFailure(request.email(), remoteIp);
			throw exception;
		}
	}

	@PostMapping("/refresh")
	public CurrentUser refresh(
			HttpServletRequest request,
			HttpServletResponse response) {
		AuthService.IssuedAuth issuedAuth = authService.refresh(cookieValue(request, AuthCookieService.REFRESH_COOKIE));
		cookieService.writeAuthCookies(response, issuedAuth.tokenIssue());
		return currentUserProfileService.toCurrentUser(issuedAuth.user(), request);
	}

	@GetMapping("/verify-email")
	public RedirectView verifyEmail(@RequestParam("token") String token) {
		authService.verifyEmail(token);
		return new RedirectView(frontendAuthUrl("verified=1"));
	}

	@PostMapping("/verify-email-code")
	public EmailVerificationResult verifyEmailCode(@RequestBody VerifyEmailCodeRequest request) {
		return authService.verifyEmailCode(request.email(), request.code());
	}

	@PostMapping("/resend-verification")
	@ResponseStatus(HttpStatus.ACCEPTED)
	public SignupResult resendVerification(
			@RequestBody ResendVerificationRequest request,
			HttpServletRequest servletRequest) {
		String remoteIp = clientIp(servletRequest);
		rateLimitService.beforeResend(request.email(), request.captchaToken(), remoteIp);
		SignupResult result = authService.resendVerification(request.email());
		rateLimitService.recordResendAttempt(request.email(), remoteIp);
		return result;
	}

	@PostMapping("/mfa/totp/setup")
	public AdminMfaService.SetupResponse setupTotp(Authentication authentication) {
		return adminMfaService.setup(appUserService.currentUser(authentication));
	}

	@GetMapping("/mfa/session")
	public CurrentUser adminMfaSession(Authentication authentication, HttpServletRequest request) {
		return currentUserProfileService.toCurrentUser(appUserService.currentUser(authentication), request);
	}

	@PostMapping("/mfa/totp/confirm")
	public AdminMfaService.VerifyResponse confirmTotp(
			Authentication authentication,
			@RequestBody TotpConfirmRequest request,
			HttpServletResponse response) {
		return adminMfaService.confirm(appUserService.currentUser(authentication), request.code(), response);
	}

	@PostMapping("/mfa/totp/verify")
	public AdminMfaService.VerifyResponse verifyTotp(
			Authentication authentication,
			@RequestBody TotpVerifyRequest request,
			HttpServletResponse response) {
		return adminMfaService.verify(appUserService.currentUser(authentication), request.code(), request.recoveryCode(), response);
	}

	@ExceptionHandler(AuthException.class)
	public ResponseEntity<AuthErrorResponse> handleAuthException(AuthException exception) {
		ResponseEntity.BodyBuilder builder = ResponseEntity.status(exception.status());
		if (exception.retryAfterSeconds() != null) {
			builder.header(HttpHeaders.RETRY_AFTER, String.valueOf(exception.retryAfterSeconds()));
		}
		return builder.body(new AuthErrorResponse(exception.errorCode(), exception.getMessage()));
	}

	private String frontendAuthUrl(String query) {
		String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
		return base + "/auth?" + query;
	}

	private String cookieValue(HttpServletRequest request, String name) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		for (Cookie cookie : cookies) {
			if (name.equals(cookie.getName())) {
				return cookie.getValue();
			}
		}
		return null;
	}

	private String clientIp(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			return forwarded.split(",")[0].trim();
		}
		return request.getRemoteAddr();
	}
}
