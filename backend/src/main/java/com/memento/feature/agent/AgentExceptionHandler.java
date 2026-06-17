package com.memento.feature.agent;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {AgentRunController.class, AgentToolController.class})
class AgentExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleValidationError(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        return problem(
                "Invalid agent run request",
                HttpStatus.BAD_REQUEST,
                "INVALID_AGENT_RUN_REQUEST",
                "Agent run request is invalid.",
                request.getRequestURI(),
                exception.getBindingResult()
                        .getFieldErrors()
                        .stream()
                        .map(error -> new ProblemDetailsResponse.FieldError(
                                error.getField(),
                                error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage()))
                        .toList());
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, ConstraintViolationException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleBadRequest(HttpServletRequest request) {
        return problem(
                "Invalid agent run request",
                HttpStatus.BAD_REQUEST,
                "INVALID_AGENT_RUN_REQUEST",
                "Agent run request is invalid.",
                request.getRequestURI(),
                List.of());
    }

    @ExceptionHandler(AgentRunInvalidRequestException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleInvalidAgentRun(
            AgentRunInvalidRequestException exception,
            HttpServletRequest request) {
        return problem(
                "Invalid agent run request",
                HttpStatus.BAD_REQUEST,
                "INVALID_AGENT_RUN_REQUEST",
                exception.getMessage(),
                request.getRequestURI(),
                List.of());
    }

    @ExceptionHandler(AgentRunNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ProblemDetailsResponse handleAgentRunNotFound(HttpServletRequest request) {
        return problem(
                "Agent run not found",
                HttpStatus.NOT_FOUND,
                "AGENT_RUN_NOT_FOUND",
                "Agent run was not found.",
                request.getRequestURI(),
                List.of());
    }

    @ExceptionHandler(AgentProviderException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    ProblemDetailsResponse handleAgentProviderFailed(HttpServletRequest request) {
        return problem(
                "Agent provider unavailable",
                HttpStatus.BAD_GATEWAY,
                "AGENT_PROVIDER_UNAVAILABLE",
                "Agent provider is temporarily unavailable.",
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
