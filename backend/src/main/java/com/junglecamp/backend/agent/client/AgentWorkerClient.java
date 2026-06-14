package com.junglecamp.backend.agent.client;

import com.junglecamp.backend.agent.dto.AgentDtos;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunDetail;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerBriefingResponse;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentWorkerChatResponse;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomyDashboard;

public interface AgentWorkerClient {

	AgentWorkerBriefingResponse createBriefing(EconomyDashboard dashboard, String locale);

	AgentWorkerChatResponse chat(
			AgentRunDetail run,
			String message,
			EconomyDashboard dashboard,
			String toolPolicy,
			String agentId,
			String locale);
}
