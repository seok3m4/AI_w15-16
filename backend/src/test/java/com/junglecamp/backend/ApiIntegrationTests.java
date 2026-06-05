package com.junglecamp.backend;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void exposesPublicBackendStatusForFrontend() throws Exception {
		mockMvc.perform(get("/api/status").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.service").value("Jungle AI Backend"))
				.andExpect(jsonPath("$.status").value("running"))
				.andExpect(jsonPath("$.message").value("Backend API is connected."));
	}

	@Test
	void rejectsAnonymousApiUserRequestsWithUnauthorizedStatus() throws Exception {
		mockMvc.perform(get("/api/me").accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void returnsCurrentUserForAuthenticatedApiRequests() throws Exception {
		mockMvc.perform(get("/api/me")
						.with(user("tester"))
						.accept(MediaType.APPLICATION_JSON))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.username").value("tester"));
	}
}
