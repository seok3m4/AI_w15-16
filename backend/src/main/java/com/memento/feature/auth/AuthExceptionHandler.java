package com.memento.feature.auth;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AuthController.class)
class AuthExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleValidationError(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        List<ProblemDetailsResponse.FieldError> errors = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new ProblemDetailsResponse.FieldError(
                        error.getField(),
                        error.getDefaultMessage()))
                .toList();
        return problem(
                "validation-error",
                "Validation failed",
                HttpStatus.BAD_REQUEST,
                "Request validation failed.",
                request,
                "VALIDATION_ERROR",
                errors);
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ProblemDetailsResponse handleEmailAlreadyExists(HttpServletRequest request) {
        return problem(
                "email-already-exists",
                "Conflict",
                HttpStatus.CONFLICT,
                "Email already exists.",
                request,
                "EMAIL_ALREADY_EXISTS",
                List.of());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ProblemDetailsResponse handleInvalidCredentials(HttpServletRequest request) {
        return problem(
                "invalid-credentials",
                "Unauthorized",
                HttpStatus.UNAUTHORIZED,
                "Email or password is invalid.",
                request,
                "INVALID_CREDENTIALS",
                List.of());
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ProblemDetailsResponse handleInvalidRefreshToken(HttpServletRequest request) {
        return problem(
                "invalid-refresh-token",
                "Unauthorized",
                HttpStatus.UNAUTHORIZED,
                "Refresh token is invalid.",
                request,
                "INVALID_REFRESH_TOKEN",
                List.of());
    }

    @ExceptionHandler(InvalidAccessTokenException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ProblemDetailsResponse handleInvalidAccessToken(HttpServletRequest request) {
        return unauthorized(request.getRequestURI());
    }

    static ProblemDetailsResponse unauthorized(String instance) {
        return new ProblemDetailsResponse(
                "https://memento.local/problems/unauthorized",
                "Unauthorized",
                HttpStatus.UNAUTHORIZED.value(),
                "Authentication is required.",
                instance,
                "UNAUTHORIZED",
                List.of());
    }

    private ProblemDetailsResponse problem(
            String typeSlug,
            String title,
            HttpStatus status,
            String detail,
            HttpServletRequest request,
            String code,
            List<ProblemDetailsResponse.FieldError> errors) {
        return new ProblemDetailsResponse(
                "https://memento.local/problems/" + typeSlug,
                title,
                status.value(),
                detail,
                request.getRequestURI(),
                code,
                errors);
    }

    record ProblemDetailsResponse(
            String type,
            String title,
            int status,
            String detail,
            String instance,
            String code,
            List<FieldError> errors) {

        record FieldError(String field, String message) {
        }
    }
}
