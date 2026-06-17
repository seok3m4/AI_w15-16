package com.memento.feature.mcp;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {McpManagementController.class, McpProtocolController.class})
class McpExceptionHandler {

    @ExceptionHandler({McpInvalidRequestException.class, MethodArgumentNotValidException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ProblemDetailsResponse handleInvalid(Exception exception, HttpServletRequest request) {
        String detail = exception instanceof McpInvalidRequestException
                ? exception.getMessage()
                : "MCP request is invalid.";
        return problem("Invalid MCP request", HttpStatus.BAD_REQUEST, "INVALID_MCP_REQUEST", detail, request);
    }

    @ExceptionHandler(McpUnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ProblemDetailsResponse handleUnauthorized(HttpServletRequest request) {
        return problem("MCP authentication failed", HttpStatus.UNAUTHORIZED, "MCP_UNAUTHORIZED", "MCP bearer token is required.", request);
    }

    @ExceptionHandler(McpForbiddenException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    ProblemDetailsResponse handleForbidden(McpForbiddenException exception, HttpServletRequest request) {
        return problem("MCP scope is not allowed", HttpStatus.FORBIDDEN, "MCP_FORBIDDEN", exception.getMessage(), request);
    }

    private ProblemDetailsResponse problem(
            String title,
            HttpStatus status,
            String code,
            String detail,
            HttpServletRequest request) {
        return new ProblemDetailsResponse(
                "https://memento.local/problems/" + code.toLowerCase(),
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
