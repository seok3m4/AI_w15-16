package com.memento.feature.tag;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TagController.class)
class TagControllerTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TAG_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TagQueryService tagQueryService;

    @Test
    void listTagsReturnsCurrentUserTagsWithDefaultPage() throws Exception {
        TagListResponse response = new TagListResponse(
                List.of(new TagResponse(TAG_ID, "retrospective", 2)),
                new TagPageResponse(0, 50, 1, 1));
        given(tagQueryService.list(USER_ID, 0, 50)).willReturn(response);

        mockMvc.perform(get("/api/v1/tags")
                        .requestAttr(
                                AuthenticatedUserPrincipal.REQUEST_ATTRIBUTE,
                                new AuthenticatedUserPrincipal(USER_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value("22222222-2222-2222-2222-222222222222"))
                .andExpect(jsonPath("$.items[0].name").value("retrospective"))
                .andExpect(jsonPath("$.items[0].postCount").value(2))
                .andExpect(jsonPath("$.page.page").value(0))
                .andExpect(jsonPath("$.page.size").value(50))
                .andExpect(jsonPath("$.page.totalCount").value(1))
                .andExpect(jsonPath("$.page.totalPages").value(1));

        verify(tagQueryService).list(USER_ID, 0, 50);
    }
}
