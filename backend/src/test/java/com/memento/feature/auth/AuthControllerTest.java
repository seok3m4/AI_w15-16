package com.memento.feature.auth;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthSignupService signupService;

    @MockitoBean
    private AuthLoginService loginService;

    @Test
    void signupReturnsCreatedUser() throws Exception {
        SignupRequest request = new SignupRequest("user@example.com", "password1234!", "cutan");
        UserPrivateResponse response = new UserPrivateResponse(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "user@example.com",
                "cutan",
                false,
                Instant.parse("2026-06-15T03:10:00Z"));

        given(signupService.signup(request)).willReturn(response);

        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.email").value("user@example.com"))
                .andExpect(jsonPath("$.nickname").value("cutan"))
                .andExpect(jsonPath("$.friendAiSharingEnabled").value(false))
                .andExpect(jsonPath("$.createdAt").value("2026-06-15T03:10:00Z"));
    }

    @Test
    void signupRejectsInvalidRequest() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "not-email",
                                "password", "short",
                                "nickname", ""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void signupRejectsDuplicatedEmail() throws Exception {
        SignupRequest request = new SignupRequest("user@example.com", "password1234!", "cutan");
        given(signupService.signup(request)).willThrow(new EmailAlreadyExistsException());

        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"));
    }

    @Test
    void loginReturnsAccessTokenAndRefreshCookie() throws Exception {
        LoginRequest request = new LoginRequest("user@example.com", "password1234!");
        LoginResponse response = new LoginResponse(
                "access-token",
                "Bearer",
                3600,
                new AuthenticatedUserResponse(
                        UUID.fromString("11111111-1111-1111-1111-111111111111"),
                        "user@example.com",
                        "cutan"),
                new RefreshCookie("refresh-token", 1_209_600, false));

        given(loginService.login(request)).willReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600))
                .andExpect(jsonPath("$.user.id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.user.email").value("user@example.com"))
                .andExpect(jsonPath("$.user.nickname").value("cutan"))
                .andExpect(cookie().value("refreshToken", "refresh-token"))
                .andExpect(cookie().httpOnly("refreshToken", true))
                .andExpect(cookie().path("refreshToken", "/api/v1/auth"))
                .andExpect(cookie().maxAge("refreshToken", 1_209_600));
    }

    @Test
    void loginRejectsInvalidCredentials() throws Exception {
        LoginRequest request = new LoginRequest("user@example.com", "wrong-password");
        given(loginService.login(request)).willThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void refreshReturnsNewAccessTokenAndRefreshCookie() throws Exception {
        RefreshResponse response = new RefreshResponse(
                "new-access-token",
                "Bearer",
                3600,
                new RefreshCookie("new-refresh-token", 1_209_600, false));
        given(loginService.refresh("old-refresh-token")).willReturn(response);

        Cookie cookie = new Cookie("refreshToken", "old-refresh-token");
        mockMvc.perform(post("/api/v1/auth/refresh").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600))
                .andExpect(cookie().value("refreshToken", "new-refresh-token"))
                .andExpect(cookie().httpOnly("refreshToken", true));
    }

    @Test
    void refreshRejectsMissingCookie() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }
}
