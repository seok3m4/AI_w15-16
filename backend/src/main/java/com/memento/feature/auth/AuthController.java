package com.memento.feature.auth;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {

    private final AuthSignupService signupService;
    private final AuthLoginService loginService;
    private final AuthCurrentUserService currentUserService;

    AuthController(
            AuthSignupService signupService,
            AuthLoginService loginService,
            AuthCurrentUserService currentUserService) {
        this.signupService = signupService;
        this.loginService = loginService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    UserPrivateResponse signup(@Valid @RequestBody SignupRequest request) {
        return signupService.signup(request);
    }

    @PostMapping("/login")
    LoginResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse servletResponse) {
        LoginResponse response = loginService.login(request);
        addRefreshCookie(servletResponse, response.refreshCookie());
        return response;
    }

    @PostMapping("/refresh")
    RefreshResponse refresh(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletResponse servletResponse) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new InvalidRefreshTokenException();
        }
        RefreshResponse response = loginService.refresh(refreshToken);
        addRefreshCookie(servletResponse, response.refreshCookie());
        return response;
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletResponse servletResponse) {
        loginService.logout(currentUser.userId(), refreshToken);
        clearRefreshCookie(servletResponse);
    }

    @GetMapping("/me")
    UserPrivateResponse me(@CurrentUser AuthenticatedUserPrincipal currentUser) {
        return currentUserService.me(currentUser.userId());
    }

    private void addRefreshCookie(HttpServletResponse servletResponse, RefreshCookie refreshCookie) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshCookie.value())
                .httpOnly(true)
                .secure(refreshCookie.secure())
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(refreshCookie.maxAgeSeconds())
                .build();
        servletResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse servletResponse) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(0)
                .build();
        servletResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
