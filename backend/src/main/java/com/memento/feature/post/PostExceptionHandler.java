package com.memento.feature.post;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = PostController.class)
class PostExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleValidationError(HttpServletRequest request) {
        return problem(
                "validation-error",
                "Validation failed",
                HttpStatus.BAD_REQUEST,
                "Request validation failed.",
                request,
                "VALIDATION_ERROR");
    }

    @ExceptionHandler(PostInvalidQueryException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleInvalidQuery(
            PostInvalidQueryException exception,
            HttpServletRequest request) {
        return problem(
                "invalid-post-query",
                "Invalid post query",
                HttpStatus.BAD_REQUEST,
                exception.getMessage(),
                request,
                "INVALID_POST_QUERY");
    }

    @ExceptionHandler(PostNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ProblemDetailsResponse handlePostNotFound(HttpServletRequest request) {
        return problem(
                "post-not-found",
                "Post not found",
                HttpStatus.NOT_FOUND,
                "Post was not found.",
                request,
                "POST_NOT_FOUND");
    }

    private ProblemDetailsResponse problem(
            String typeSlug,
            String title,
            HttpStatus status,
            String detail,
            HttpServletRequest request,
            String code) {
        return new ProblemDetailsResponse(
                "https://memento.local/problems/" + typeSlug,
                title,
                status.value(),
                detail,
                request.getRequestURI(),
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
