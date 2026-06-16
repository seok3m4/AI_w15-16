package com.memento.feature.memory;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = PostMemoryController.class)
class PostMemoryExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleValidationError(MethodArgumentNotValidException exception, HttpServletRequest request) {
        return problem(
                "Invalid reindex request",
                HttpStatus.BAD_REQUEST,
                "INVALID_REINDEX_REQUEST",
                "postIds must not be empty.",
                request.getRequestURI(),
                exception.getBindingResult()
                        .getFieldErrors()
                        .stream()
                        .map(error -> new ProblemDetailsResponse.FieldError(
                                error.getField(),
                                error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage()))
                        .toList());
    }

    @ExceptionHandler(ReindexRequestInvalidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleReindexRequestInvalid(
            ReindexRequestInvalidException exception,
            HttpServletRequest request) {
        return problem(
                "Invalid reindex request",
                HttpStatus.BAD_REQUEST,
                "INVALID_REINDEX_REQUEST",
                exception.getMessage(),
                request.getRequestURI(),
                List.of());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleBadJson(HttpServletRequest request) {
        return problem(
                "Invalid request",
                HttpStatus.BAD_REQUEST,
                "INVALID_REINDEX_REQUEST",
                "Request body is invalid.",
                request.getRequestURI(),
                List.of());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleConstraintViolation(ConstraintViolationException exception, HttpServletRequest request) {
        return problem(
                "Invalid request",
                HttpStatus.BAD_REQUEST,
                "INVALID_REINDEX_REQUEST",
                exception.getMessage(),
                request.getRequestURI(),
                List.of());
    }

    @ExceptionHandler(PostNotFoundForMemoryStatusException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ProblemDetailsResponse handlePostNotFound(HttpServletRequest request) {
        return problem(
                "Post not found",
                HttpStatus.NOT_FOUND,
                "POST_NOT_FOUND",
                "Post not found.",
                request.getRequestURI(),
                List.of());
    }

    @ExceptionHandler(JobNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ProblemDetailsResponse handleJobNotFound(HttpServletRequest request) {
        return problem(
                "Async job not found",
                HttpStatus.NOT_FOUND,
                "JOB_NOT_FOUND",
                "Async job not found.",
                request.getRequestURI(),
                List.of());
    }

    private ProblemDetailsResponse problem(
            String title,
            HttpStatus status,
            String code,
            String detail,
            String instance,
            List<ProblemDetailsResponse.FieldError> errors) {
        return new ProblemDetailsResponse(
                "https://memento.local/problems/" + code.toLowerCase(),
                title,
                status.value(),
                detail,
                instance,
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
