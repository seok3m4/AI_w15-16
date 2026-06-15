package com.junglecamp.backend.auth.client;
public interface CaptchaVerifier {

	boolean verify(String token, String remoteIp);
}
