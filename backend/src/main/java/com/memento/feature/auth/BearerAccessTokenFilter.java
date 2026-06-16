package com.memento.feature.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

class BearerAccessTokenFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenService jwtTokenService;
    private final Clock clock;

    BearerAccessTokenFilter(JwtTokenService jwtTokenService, Clock clock) {
        this.jwtTokenService = jwtTokenService;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
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
            writeUnauthorized(response);
            return;
        }

        Optional<AccessTokenClaims> claims = jwtTokenService.verifyAccessToken(
                authorization.substring(BEARER_PREFIX.length()).trim(),
                clock.instant());
        if (claims.isEmpty()) {
            writeUnauthorized(response);
            return;
        }

        request.setAttribute(
                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                new AuthenticatedUserPrincipal(claims.get().userId()));
        filterChain.doFilter(request, response);
    }

    private void writeUnauthorized(HttpServletResponse response) {
        try {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                    {"code":"UNAUTHORIZED","message":"Authentication is required."}
                    """.trim());
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
