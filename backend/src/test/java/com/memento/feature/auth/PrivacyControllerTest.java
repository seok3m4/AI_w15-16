package com.memento.feature.auth;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.privacy.AiSharingSettingResponse;
import com.memento.feature.privacy.PrivacyAiSharingService;
import com.memento.feature.privacy.PrivacyController;
import com.memento.feature.privacy.PrivacyExceptionHandler;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PrivacyController.class)
@Import({
        PrivacyControllerTest.FixedClockConfig.class,
        AuthWebConfig.class,
        BearerAccessTokenFilter.class,
        CurrentUserArgumentResolver.class,
        PrivacyExceptionHandler.class
})
class PrivacyControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PrivacyAiSharingService privacyAiSharingService;

    @MockitoBean
    private JwtTokenService jwtTokenService;

    @Test
    void updateAiSharingReturnsUpdatedConsentForCurrentUser() throws Exception {
        given(jwtTokenService.verifyAccessToken("access-token", NOW))
                .willReturn(Optional.of(new AccessTokenClaims(USER_ID)));
        given(privacyAiSharingService.updateAiSharing(USER_ID, true))
                .willReturn(new AiSharingSettingResponse(true, NOW));

        mockMvc.perform(put("/api/v1/privacy/ai-sharing")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("enabled", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.friendAiSharingEnabled").value(true))
                .andExpect(jsonPath("$.updatedAt").value("2026-06-15T03:10:00Z"));
    }

    @Test
    void updateAiSharingRejectsMissingBearerToken() throws Exception {
        mockMvc.perform(put("/api/v1/privacy/ai-sharing")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("enabled", true))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void updateAiSharingRejectsMissingEnabledField() throws Exception {
        given(jwtTokenService.verifyAccessToken("access-token", NOW))
                .willReturn(Optional.of(new AccessTokenClaims(USER_ID)));

        mockMvc.perform(put("/api/v1/privacy/ai-sharing")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.instance").value("/api/v1/privacy/ai-sharing"));
    }

    @TestConfiguration
    static class FixedClockConfig {

        @Bean
        Clock clock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }
}
