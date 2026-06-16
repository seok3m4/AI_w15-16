package com.memento.feature.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

class BearerAccessTokenFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenService jwtTokenService;
    private final Clock clock;
    private final ObjectMapper objectMapper;

    BearerAccessTokenFilter(
            JwtTokenService jwtTokenService,
            Clock clock,
            ObjectMapper objectMapper) {
        this.jwtTokenService = jwtTokenService;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        if (!path.startsWith("/api/v1/")) {
            return true;
        }
        return path.equals("/api/v1/auth/signup")
                || path.equals("/api/v1/auth/login")
                || path.equals("/api/v1/auth/refresh");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            writeUnauthorized(request, response);
            return;
        }

        Optional<AccessTokenClaims> claims = jwtTokenService.verifyAccessToken(
                authorization.substring(BEARER_PREFIX.length()).trim(),
                clock.instant());
        if (claims.isEmpty()) {
            writeUnauthorized(request, response);
            return;
        }

        request.setAttribute(
                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                new AuthenticatedUserPrincipal(claims.get().userId()));
        filterChain.doFilter(request, response);
    }

    private void writeUnauthorized(HttpServletRequest request, HttpServletResponse response) {
        try {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            objectMapper.writeValue(
                    response.getWriter(),
                    AuthExceptionHandler.unauthorized(request.getRequestURI()));
        } catch (IOException exception) {
            throw new FilterChainException(exception);
        }
    }

    private static class FilterChainException extends RuntimeException {

        private FilterChainException(Exception cause) {
            super(cause);
        }
    }
}
