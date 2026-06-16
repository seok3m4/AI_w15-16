package com.junglecamp.backend.auth.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpVerificationEmailSenderTests {

	@Test
	void sendsCodeOnlyVerificationEmailWithoutLink() {
		JavaMailSender mailSender = mock(JavaMailSender.class);
		SmtpVerificationEmailSender sender = new SmtpVerificationEmailSender(mailSender, "useconai@gmail.com");

		sender.sendVerificationEmail(
				"new-user@example.com",
				"http://localhost:5173/api/auth/verify-email?token=test-token",
				"426495");

		ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
		verify(mailSender).send(messageCaptor.capture());

		SimpleMailMessage message = messageCaptor.getValue();
		assertThat(message.getFrom()).isEqualTo("useconai@gmail.com");
		assertThat(message.getTo()).containsExactly("new-user@example.com");
		assertThat(message.getSubject()).isEqualTo("US ECON AI 이메일 인증");
		assertThat(message.getText())
				.contains("US ECON AI 계정 이메일 인증 코드입니다.")
				.contains("인증 코드: 426495")
				.contains("요청한 적이 없다면 이 메일은 무시해도 됩니다.")
				.contains("본 메일은 발신 전용입니다. 답장하지 않아도 됩니다.")
				.doesNotContain("verify-email?token=")
				.doesNotContain("링크 인증")
				.doesNotContain("아래 주소");
	}
}
