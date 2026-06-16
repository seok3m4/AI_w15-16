package com.memento.feature.privacy;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = PrivacyController.class)
public class PrivacyExceptionHandler {

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

    @ExceptionHandler(PrivacyUnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ProblemDetailsResponse handlePrivacyUnauthorized(HttpServletRequest request) {
        return problem(
                "unauthorized",
                "Unauthorized",
                HttpStatus.UNAUTHORIZED,
                "Authentication is required.",
                request,
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
