package com.memento.feature.friend;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = FriendshipController.class)
class FriendshipExceptionHandler {

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

    @ExceptionHandler(CannotFriendSelfException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleCannotFriendSelf(HttpServletRequest request) {
        return problem(
                "cannot-friend-self",
                "Cannot friend self",
                HttpStatus.BAD_REQUEST,
                "Cannot send a friendship request to yourself.",
                request,
                "CANNOT_FRIEND_SELF");
    }

    @ExceptionHandler(FriendshipAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ProblemDetailsResponse handleFriendshipAlreadyExists(HttpServletRequest request) {
        return problem(
                "friendship-already-exists",
                "Friendship already exists",
                HttpStatus.CONFLICT,
                "A pending or accepted friendship already exists.",
                request,
                "FRIENDSHIP_ALREADY_EXISTS");
    }

    @ExceptionHandler(FriendshipUserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ProblemDetailsResponse handleFriendshipUserNotFound(HttpServletRequest request) {
        return problem(
                "friendship-user-not-found",
                "Friendship user not found",
                HttpStatus.NOT_FOUND,
                "Friendship target user was not found.",
                request,
                "FRIENDSHIP_USER_NOT_FOUND");
    }

    @ExceptionHandler(FriendshipNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ProblemDetailsResponse handleFriendshipNotFound(HttpServletRequest request) {
        return problem(
                "friendship-not-found",
                "Friendship not found",
                HttpStatus.NOT_FOUND,
                "Friendship request was not found.",
                request,
                "FRIENDSHIP_NOT_FOUND");
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
