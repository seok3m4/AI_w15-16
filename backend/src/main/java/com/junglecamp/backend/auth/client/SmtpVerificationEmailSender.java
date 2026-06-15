package com.junglecamp.backend.auth.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Service;

@Service
public class SmtpVerificationEmailSender implements VerificationEmailSender {

	private final JavaMailSender mailSender;
	private final String from;

	public SmtpVerificationEmailSender(
			JavaMailSender mailSender,
			@Value("${app.auth.email.from:no-reply@localhost}") String from) {
		this.mailSender = mailSender;
		this.from = from;
	}

	@Override
	public void sendVerificationEmail(String email, String verificationUrl, String verificationCode) {
		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(from);
		message.setTo(email);
		message.setSubject("US ECON AI 이메일 인증");
		message.setText("""
				US ECON AI 계정 이메일 인증 코드입니다.

				인증 코드: %s

				링크 인증을 선호한다면 아래 주소를 열어도 됩니다.

				%s

				요청한 적이 없다면 이 메일은 무시해도 됩니다.
				""".formatted(verificationCode, verificationUrl));
		mailSender.send(message);
	}
}
