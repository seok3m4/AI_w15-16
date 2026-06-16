package com.memento.feature.like;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = PostLikeController.class)
class PostLikeExceptionHandler {

    @ExceptionHandler(PostLikePostNotFoundException.class)
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
