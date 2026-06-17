package com.memento.feature.capsule;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = ContextCapsuleController.class)
class ContextCapsuleExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleValidationError(HttpServletRequest request) {
        return problem(
                "Invalid context capsule request",
                HttpStatus.BAD_REQUEST,
                "INVALID_CONTEXT_CAPSULE_REQUEST",
                "Context capsule request is invalid.",
                request.getRequestURI());
    }

    @ExceptionHandler({ContextCapsuleInvalidRequestException.class, HttpMessageNotReadableException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleInvalidRequest(Exception exception, HttpServletRequest request) {
        String detail = exception instanceof ContextCapsuleInvalidRequestException
                ? exception.getMessage()
                : "Request body is invalid.";
        return problem(
                "Invalid context capsule request",
                HttpStatus.BAD_REQUEST,
                "INVALID_CONTEXT_CAPSULE_REQUEST",
                detail,
                request.getRequestURI());
    }

    @ExceptionHandler(ContextCapsuleSourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ProblemDetailsResponse handleSourceNotFound(HttpServletRequest request) {
        return problem(
                "Context capsule source not found",
                HttpStatus.NOT_FOUND,
                "CAPSULE_SOURCE_NOT_FOUND",
                "Context capsule source was not found.",
                request.getRequestURI());
    }

    @ExceptionHandler(ContextCapsuleNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ProblemDetailsResponse handleNotFound(HttpServletRequest request) {
        return problem(
                "Context capsule not found",
                HttpStatus.NOT_FOUND,
                "CAPSULE_NOT_FOUND",
                "Context capsule was not found.",
                request.getRequestURI());
    }

    @ExceptionHandler(ContextCapsuleDraftFailedException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    ProblemDetailsResponse handleDraftFailed(HttpServletRequest request) {
        return problem(
                "Context capsule draft unavailable",
                HttpStatus.BAD_GATEWAY,
                "CAPSULE_DRAFT_UNAVAILABLE",
                "Context capsule draft provider is temporarily unavailable.",
                request.getRequestURI());
    }

    @ExceptionHandler(ContextCapsuleInvalidQueryException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleInvalidQuery(ContextCapsuleInvalidQueryException exception, HttpServletRequest request) {
        return problem(
                "Invalid context capsule query",
                HttpStatus.BAD_REQUEST,
                "INVALID_CONTEXT_CAPSULE_QUERY",
                exception.getMessage(),
                request.getRequestURI());
    }

    private ProblemDetailsResponse problem(
            String title,
            HttpStatus status,
            String code,
            String detail,
            String instance) {
        return new ProblemDetailsResponse(
                "https://memento.local/problems/" + code.toLowerCase(),
                title,
                status.value(),
                detail,
                instance,
                code,
                List.of());
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
