package com.junglecamp.backend.agent.client;

import com.junglecamp.backend.agent.dto.AgentDtos;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunDetail;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerBriefingRequest;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerBriefingResponse;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerChatRequest;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerChatResponse;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomyDashboard;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class HttpAgentWorkerClient implements AgentWorkerClient {

	private final RestClient restClient;
	private final String token;
	private final String model;

	@Autowired
	public HttpAgentWorkerClient(
			@Value("${app.agents.worker-url:http://localhost:8090}") String workerUrl,
			@Value("${app.agents.worker-token:local-agent-token}") String token,
			@Value("${app.agents.model:gpt-5.5}") String model) {
		this(RestClient.builder()
				.baseUrl(workerUrl)
				.requestFactory(new SimpleClientHttpRequestFactory())
				.build(), token, model);
	}

	HttpAgentWorkerClient(RestClient restClient, String token, String model) {
		this.restClient = restClient;
		this.token = token;
		this.model = model;
	}

	@Override
	public AgentWorkerBriefingResponse createBriefing(EconomyDashboard dashboard, String locale) {
		AgentWorkerBriefingResponse response = restClient.post()
				.uri("/agent/briefing")
				.contentType(MediaType.APPLICATION_JSON)
				.header("X-Agent-Worker-Token", token)
				.body(new AgentWorkerBriefingRequest(dashboard, model, locale))
				.retrieve()
				.body(AgentWorkerBriefingResponse.class);
		if (response == null) {
			throw new IllegalStateException("Agent worker returned an empty briefing response");
		}
		return response;
	}

	@Override
	public AgentWorkerChatResponse chat(
			AgentRunDetail run,
			String message,
			EconomyDashboard dashboard,
			String toolPolicy,
			String agentId,
			String locale) {
		AgentWorkerChatResponse response = restClient.post()
				.uri("/agent/chat")
				.contentType(MediaType.APPLICATION_JSON)
				.header("X-Agent-Worker-Token", token)
				.body(new AgentWorkerChatRequest(run, message, dashboard, model, toolPolicy, agentId, locale))
				.retrieve()
				.body(AgentWorkerChatResponse.class);
		if (response == null) {
			throw new IllegalStateException("Agent worker returned an empty chat response");
		}
		return response;
	}
}
