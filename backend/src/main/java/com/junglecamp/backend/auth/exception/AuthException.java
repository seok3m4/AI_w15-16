package com.junglecamp.backend.auth.exception;

import org.springframework.http.HttpStatus;

public class AuthException extends RuntimeException {

	private final HttpStatus status;
	private final String errorCode;
	private final Long retryAfterSeconds;

	public AuthException(HttpStatus status, String errorCode, String message) {
		this(status, errorCode, message, null);
	}

	public AuthException(HttpStatus status, String errorCode, String message, Long retryAfterSeconds) {
		super(message);
		this.status = status;
		this.errorCode = errorCode;
		this.retryAfterSeconds = retryAfterSeconds;
	}

	public HttpStatus status() {
		return status;
	}

	public String errorCode() {
		return errorCode;
	}

	public Long retryAfterSeconds() {
		return retryAfterSeconds;
	}
}
