package com.memento.feature.mcp;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class McpProtocolController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final McpProtocolService protocolService;

    McpProtocolController(McpProtocolService protocolService) {
        this.protocolService = protocolService;
    }

    @PostMapping(path = "/mcp", consumes = MediaType.APPLICATION_JSON_VALUE)
    Map<String, Object> handle(
            HttpServletRequest servletRequest,
            @RequestBody Map<String, Object> request) {
        String token = bearerToken(servletRequest.getHeader(HttpHeaders.AUTHORIZATION));
        if (token == null) {
            throw new McpUnauthorizedException();
        }
        return protocolService.handle(token, request);
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            return null;
        }
        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        return token.isBlank() ? null : token;
    }
}

class McpUnauthorizedException extends RuntimeException {
}

class McpInvalidRequestException extends RuntimeException {

    McpInvalidRequestException(String message) {
        super(message);
    }
}

class McpForbiddenException extends RuntimeException {

    McpForbiddenException(String message) {
        super(message);
    }
}

