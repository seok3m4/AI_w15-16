package com.memento.feature.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AuthController.class)
class AuthExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ErrorResponse handleValidationError() {
        return new ErrorResponse("VALIDATION_ERROR", "Request validation failed.");
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ErrorResponse handleEmailAlreadyExists() {
        return new ErrorResponse("EMAIL_ALREADY_EXISTS", "Email already exists.");
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ErrorResponse handleInvalidCredentials() {
        return new ErrorResponse("INVALID_CREDENTIALS", "Email or password is invalid.");
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ErrorResponse handleInvalidRefreshToken() {
        return new ErrorResponse("INVALID_REFRESH_TOKEN", "Refresh token is invalid.");
    }

    record ErrorResponse(String code, String message) {
    }
}
