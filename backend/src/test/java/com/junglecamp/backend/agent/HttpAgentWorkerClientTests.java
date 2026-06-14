package com.junglecamp.backend.agent;

import com.junglecamp.backend.agent.client.HttpAgentWorkerClient;
import com.junglecamp.backend.agent.dto.AgentDtos;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunDetail;
import com.junglecamp.backend.agent.dto.AgentDtos.AgentRunSummary;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AgentTraceStep;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AiBrief;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomyDashboard;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.MarketSignal;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class HttpAgentWorkerClientTests {

	@Test
	void sendsJsonBodiesToAgentWorkerEndpoints() throws Exception {
		AtomicReference<String> briefingBody = new AtomicReference<>("");
		AtomicReference<String> chatBody = new AtomicReference<>("");
		AtomicReference<String> tokenHeader = new AtomicReference<>("");
		AtomicReference<String> upgradeHeader = new AtomicReference<>("");
		AtomicReference<String> http2SettingsHeader = new AtomicReference<>("");
		HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/agent/briefing", exchange -> {
			briefingBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
			tokenHeader.set(exchange.getRequestHeaders().getFirst("X-Agent-Worker-Token"));
			upgradeHeader.set(exchange.getRequestHeaders().getFirst("Upgrade"));
			http2SettingsHeader.set(exchange.getRequestHeaders().getFirst("HTTP2-Settings"));
			writeJson(exchange, """
					{"summary":"ok","statusLabel":"ok","koreaImpact":"ok","risks":[],"evidenceMetricIds":[],"evidenceEventIds":[],"evidenceNewsIds":[],"evidenceRagChunkIds":[],"evidenceItems":[],"traceSteps":[]}
					""");
		});
		server.createContext("/agent/chat", exchange -> {
			chatBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
			writeJson(exchange, """
					{"answer":"ok","answerStatus":"answered","evidenceMetricIds":[],"evidenceEventIds":[],"evidenceNewsIds":[],"evidenceRagChunkIds":[],"evidenceItems":[],"traceSteps":[]}
					""");
		});
		server.start();
		try {
			HttpAgentWorkerClient client = new HttpAgentWorkerClient(
					"http://127.0.0.1:" + server.getAddress().getPort(),
					"test-token",
					"test-model");
			EconomyDashboard dashboard = dashboard();
			AgentRunDetail run = new AgentRunDetail(
					new AgentRunSummary(1L, "summary", "completed", "summary", "ok", "impact", List.of(), List.of(), List.of(), List.of(), List.of(), "test-model", "ko", null, "2026-06-13T00:00:00Z", "2026-06-13T00:00:00Z"),
					List.of(),
					List.of(),
					List.of());

			client.createBriefing(dashboard, "ko");
			client.chat(run, "CPI가 뭐야?", dashboard, "DASHBOARD_RAG_STRICT_EVIDENCE", "beginner-explainer", "ko");

			assertThat(tokenHeader.get()).isEqualTo("test-token");
			assertThat(upgradeHeader.get()).isNull();
			assertThat(http2SettingsHeader.get()).isNull();
			assertThat(briefingBody.get()).contains("\"dashboard\"");
			assertThat(briefingBody.get()).contains("\"model\":\"test-model\"");
			assertThat(briefingBody.get()).contains("\"locale\":\"ko\"");
			assertThat(chatBody.get()).contains("\"run\"");
			assertThat(chatBody.get()).contains("\"message\":\"CPI가 뭐야?\"");
			assertThat(chatBody.get()).contains("\"agentId\":\"beginner-explainer\"");
			assertThat(chatBody.get()).contains("\"locale\":\"ko\"");
		} finally {
			server.stop(0);
		}
	}

	private static void writeJson(com.sun.net.httpserver.HttpExchange exchange, String body) throws IOException {
		byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
		exchange.getResponseHeaders().set("Content-Type", "application/json");
		exchange.sendResponseHeaders(200, bytes.length);
		exchange.getResponseBody().write(bytes);
		exchange.close();
	}

	private static EconomyDashboard dashboard() {
		return new EconomyDashboard(
				new AiBrief("summary", "ok", List.of(), List.of(), "impact", List.of(), "2026-06-13T00:00:00Z", "generated"),
				List.of(),
				List.of(),
				List.of(),
				List.of(new MarketSignal("signal", "Signal", "neutral", "1", "ok")),
				List.of(),
				List.of(),
				List.of(new AgentTraceStep("sync", "load", "source", "pass")));
	}
}
