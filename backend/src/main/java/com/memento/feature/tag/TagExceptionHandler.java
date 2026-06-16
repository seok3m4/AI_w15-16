package com.memento.feature.tag;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = TagController.class)
class TagExceptionHandler {

    @ExceptionHandler(TagInvalidQueryException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleInvalidQuery(
            TagInvalidQueryException exception,
            HttpServletRequest request) {
        return new ProblemDetailsResponse(
                "https://memento.local/problems/invalid-tag-query",
                "Invalid tag query",
                HttpStatus.BAD_REQUEST.value(),
                exception.getMessage(),
                request.getRequestURI(),
                "INVALID_TAG_QUERY",
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
