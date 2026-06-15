package com.junglecamp.backend.auth.client;
public interface VerificationEmailSender {

	void sendVerificationEmail(String email, String verificationUrl, String verificationCode);
}
