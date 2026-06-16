package com.junglecamp.backend.auth.dto;

import java.time.Instant;

public final class AuthDtos {

	private AuthDtos() {
	}

	public record SignupRequest(
			String email,
			String captchaToken) {
	}

	public record SignupCompleteRequest(
			String email,
			String password,
			String nickname,
			Boolean termsAccepted,
			Boolean privacyAccepted,
			Boolean marketingOptIn) {
	}

	public record LoginRequest(String email, String password, String captchaToken) {
	}

	public record ResendVerificationRequest(String email, String captchaToken) {
	}

	public record VerifyEmailCodeRequest(String email, String code) {
	}

	public record AuthErrorResponse(String errorCode, String message) {
	}

	public record TotpConfirmRequest(String code) {
	}

	public record TotpVerifyRequest(String code, String recoveryCode) {
	}

	public record SignupResult(String email, String status, Instant expiresAt) {
	}

	public record EmailVerificationResult(String email, String status) {
	}
}
