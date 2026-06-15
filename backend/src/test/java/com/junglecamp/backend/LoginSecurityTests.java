package com.junglecamp.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoginSecurityTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void rendersCustomLoginPageWithoutAuthentication() throws Exception {
		mockMvc.perform(get("/login"))
				.andExpect(status().isOk())
				.andExpect(view().name("login"))
				.andExpect(content().string(containsString("Jungle Camp Login")))
				.andExpect(content().string(containsString("_csrf")));
	}

	@Test
	void redirectsAnonymousUsersToLoginPage() throws Exception {
		mockMvc.perform(get("/"))
				.andExpect(status().is3xxRedirection())
				.andExpect(redirectedUrl("/login"));
	}

	@Test
	void redirectsSuccessfulLoginToFrontendBoardPage() throws Exception {
		mockMvc.perform(formLogin().user("user").password("password"))
				.andExpect(status().is3xxRedirection())
				.andExpect(redirectedUrl("http://localhost:5173/home"));
	}

	@Test
	void rendersHomePageForAuthenticatedUsers() throws Exception {
		mockMvc.perform(get("/").with(user("tester")))
				.andExpect(status().isOk())
				.andExpect(view().name("home"))
				.andExpect(content().string(containsString("tester")))
				.andExpect(content().string(containsString("로그아웃")));
	}

	@Test
	void logsOutApiSessionWithNoContentResponse() throws Exception {
		mockMvc.perform(post("/api/logout").with(user("tester")))
				.andExpect(status().isNoContent());
	}
}
