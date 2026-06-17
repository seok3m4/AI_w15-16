package com.memento.feature.capsule;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.auth.AuthenticatedUserPrincipal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ContextCapsuleController.class)
class ContextCapsuleControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CAPSULE_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID POST_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-17T00:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ContextCapsuleCreateService createService;

    @MockitoBean
    private ContextCapsuleQueryService queryService;

    @MockitoBean
    private ContextCapsuleCommandService commandService;

    @Test
    void listContextCapsulesReturnsCurrentUserPage() throws Exception {
        given(queryService.list(USER_ID, 1, 10))
                .willReturn(new ContextCapsuleListResponse(
                        List.of(new ContextCapsuleSummaryResponse(
                                CAPSULE_ID,
                                "Project handoff",
                                "external llm handoff",
                                false,
                                NOW,
                                NOW)),
                        new ContextCapsulePageResponse(1, 10, 11, 2)));

        mockMvc.perform(get("/api/v1/context-capsules")
                        .param("page", "1")
                        .param("size", "10")
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.items[0].title").value("Project handoff"))
                .andExpect(jsonPath("$.items[0].purpose").value("external llm handoff"))
                .andExpect(jsonPath("$.items[0].containsFriendContext").value(false))
                .andExpect(jsonPath("$.items[0].createdAt").value("2026-06-17T00:00:00Z"))
                .andExpect(jsonPath("$.page.page").value(1))
                .andExpect(jsonPath("$.page.size").value(10))
                .andExpect(jsonPath("$.page.totalCount").value(11))
                .andExpect(jsonPath("$.page.totalPages").value(2));

        verify(queryService).list(USER_ID, 1, 10);
    }

    @Test
    void getContextCapsuleReturnsCurrentUserDetail() throws Exception {
        given(queryService.get(USER_ID, CAPSULE_ID)).willReturn(response("Project handoff", "summary"));

        mockMvc.perform(get("/api/v1/context-capsules/{contextCapsuleId}", CAPSULE_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.title").value("Project handoff"))
                .andExpect(jsonPath("$.purpose").value("external llm handoff"))
                .andExpect(jsonPath("$.summary").value("summary"))
                .andExpect(jsonPath("$.keyFacts[0]").value("fact"))
                .andExpect(jsonPath("$.tags[0]").value("tag"))
                .andExpect(jsonPath("$.sources[0].postId").value("33333333-3333-3333-3333-333333333333"));

        verify(queryService).get(USER_ID, CAPSULE_ID);
    }

    @Test
    void getCompactContextReturnsCurrentUsersExternalLlmContext() throws Exception {
        given(queryService.compactContext(USER_ID, CAPSULE_ID))
                .willReturn(new ContextCapsuleCompactContextResponse(
                        "external llm handoff",
                        "summary",
                        List.of("fact"),
                        List.of(POST_ID),
                        List.of("tag")));

        mockMvc.perform(get("/api/v1/context-capsules/{contextCapsuleId}/compact-context", CAPSULE_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purpose").value("external llm handoff"))
                .andExpect(jsonPath("$.summary").value("summary"))
                .andExpect(jsonPath("$.keyFacts[0]").value("fact"))
                .andExpect(jsonPath("$.sourcePostIds[0]").value("33333333-3333-3333-3333-333333333333"))
                .andExpect(jsonPath("$.tags[0]").value("tag"));

        verify(queryService).compactContext(USER_ID, CAPSULE_ID);
    }

    @Test
    void updateContextCapsuleReturnsUpdatedCurrentUserDetail() throws Exception {
        UpdateContextCapsuleRequest request =
                new UpdateContextCapsuleRequest("Updated handoff", "updated purpose");
        given(commandService.update(USER_ID, CAPSULE_ID, request))
                .willReturn(response("Updated handoff", "updated summary"));

        mockMvc.perform(put("/api/v1/context-capsules/{contextCapsuleId}", CAPSULE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated handoff"))
                .andExpect(jsonPath("$.summary").value("updated summary"));

        verify(commandService).update(USER_ID, CAPSULE_ID, request);
    }

    @Test
    void updateContextCapsuleRejectsBlankTitle() throws Exception {
        mockMvc.perform(put("/api/v1/context-capsules/{contextCapsuleId}", CAPSULE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", " ",
                                "purpose", "updated purpose"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CONTEXT_CAPSULE_REQUEST"));
    }

    @Test
    void getUpdateAndDeleteMapInaccessibleCapsuleToNotFound() throws Exception {
        UpdateContextCapsuleRequest request =
                new UpdateContextCapsuleRequest("Updated handoff", "updated purpose");
        given(queryService.get(USER_ID, CAPSULE_ID)).willThrow(new ContextCapsuleNotFoundException(CAPSULE_ID));
        given(commandService.update(USER_ID, CAPSULE_ID, request))
                .willThrow(new ContextCapsuleNotFoundException(CAPSULE_ID));
        willThrow(new ContextCapsuleNotFoundException(CAPSULE_ID))
                .given(commandService)
                .delete(USER_ID, CAPSULE_ID);

        mockMvc.perform(get("/api/v1/context-capsules/{contextCapsuleId}", CAPSULE_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAPSULE_NOT_FOUND"));

        mockMvc.perform(put("/api/v1/context-capsules/{contextCapsuleId}", CAPSULE_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAPSULE_NOT_FOUND"));

        mockMvc.perform(delete("/api/v1/context-capsules/{contextCapsuleId}", CAPSULE_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAPSULE_NOT_FOUND"));
    }

    @Test
    void deleteContextCapsuleReturnsNoContentForCurrentUser() throws Exception {
        mockMvc.perform(delete("/api/v1/context-capsules/{contextCapsuleId}", CAPSULE_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isNoContent());

        verify(commandService).delete(USER_ID, CAPSULE_ID);
    }

    private ContextCapsuleResponse response(String title, String summary) {
        return new ContextCapsuleResponse(
                CAPSULE_ID,
                title,
                "external llm handoff",
                "query",
                summary,
                List.of("fact"),
                List.of("tag"),
                false,
                List.of(new ContextCapsuleSourceResponse(
                        POST_ID,
                        UUID.fromString("44444444-4444-4444-4444-444444444444"),
                        USER_ID,
                        "cutan",
                        "source title",
                        "source snippet",
                        "post",
                        NOW)),
                NOW,
                NOW);
    }
}
