package com.memento.feature.friend;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.memento.feature.auth.AuthenticatedUserPrincipal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(FriendshipController.class)
class FriendshipControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FRIEND_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID FRIENDSHIP_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private FriendshipCommandService friendshipCommandService;

    @Test
    void createRequestReturnsPendingFriendship() throws Exception {
        CreateFriendshipRequest request = new CreateFriendshipRequest(FRIEND_ID);
        FriendshipResponse response = new FriendshipResponse(
                FRIENDSHIP_ID,
                new FriendshipUserResponse(USER_ID, "cutan"),
                new FriendshipUserResponse(FRIEND_ID, "friend"),
                "pending",
                NOW,
                NOW);

        given(friendshipCommandService.createRequest(USER_ID, request)).willReturn(response);

        mockMvc.perform(post("/api/v1/friendships/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("33333333-3333-3333-3333-333333333333"))
                .andExpect(jsonPath("$.requester.id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.requester.nickname").value("cutan"))
                .andExpect(jsonPath("$.addressee.id").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.addressee.nickname").value("friend"))
                .andExpect(jsonPath("$.status").value("pending"))
                .andExpect(jsonPath("$.createdAt").value("2026-06-15T03:10:00Z"))
                .andExpect(jsonPath("$.updatedAt").value("2026-06-15T03:10:00Z"));

        verify(friendshipCommandService).createRequest(USER_ID, request);
    }

    @Test
    void createRequestRejectsMissingAddressee() throws Exception {
        mockMvc.perform(post("/api/v1/friendships/requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID))
                        .content(objectMapper.writeValueAsString(Map.of())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void acceptRequestReturnsAcceptedStatus() throws Exception {
        FriendshipStatusResponse response = new FriendshipStatusResponse(FRIENDSHIP_ID, "accepted", NOW);
        given(friendshipCommandService.accept(USER_ID, FRIENDSHIP_ID)).willReturn(response);

        mockMvc.perform(post("/api/v1/friendships/{friendshipId}/accept", FRIENDSHIP_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("33333333-3333-3333-3333-333333333333"))
                .andExpect(jsonPath("$.status").value("accepted"))
                .andExpect(jsonPath("$.updatedAt").value("2026-06-15T03:10:00Z"));

        verify(friendshipCommandService).accept(USER_ID, FRIENDSHIP_ID);
    }

    @Test
    void rejectRequestReturnsRejectedStatus() throws Exception {
        FriendshipStatusResponse response = new FriendshipStatusResponse(FRIENDSHIP_ID, "rejected", NOW);
        given(friendshipCommandService.reject(USER_ID, FRIENDSHIP_ID)).willReturn(response);

        mockMvc.perform(post("/api/v1/friendships/{friendshipId}/reject", FRIENDSHIP_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("33333333-3333-3333-3333-333333333333"))
                .andExpect(jsonPath("$.status").value("rejected"))
                .andExpect(jsonPath("$.updatedAt").value("2026-06-15T03:10:00Z"));

        verify(friendshipCommandService).reject(USER_ID, FRIENDSHIP_ID);
    }

    @Test
    void acceptUnknownRequestReturnsNotFound() throws Exception {
        given(friendshipCommandService.accept(USER_ID, FRIENDSHIP_ID))
                .willThrow(new FriendshipNotFoundException());

        mockMvc.perform(post("/api/v1/friendships/{friendshipId}/accept", FRIENDSHIP_ID)
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("FRIENDSHIP_NOT_FOUND"));
    }
}
