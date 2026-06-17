package com.memento.feature.agent;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
class RestFastApiAgentClient implements FastApiAgentClient {

    private static final String AGENT_EXECUTE_PATH = "/internal/v1/agent-runs/execute";

    private final RestTemplate agentRestTemplate;
    private final AgentProperties properties;

    RestFastApiAgentClient(
            @Qualifier("agentRestTemplate") RestTemplate agentRestTemplate,
            AgentProperties properties) {
        this.agentRestTemplate = agentRestTemplate;
        this.properties = properties;
    }

    @Override
    public FastApiAgentRunResponse execute(FastApiAgentRunRequest request) {
        try {
            FastApiAgentRunResponse response = agentRestTemplate.postForObject(
                    url(),
                    request,
                    FastApiAgentRunResponse.class);
            if (response == null) {
                throw new AgentProviderException("Agent provider returned an empty response.");
            }
            return response;
        } catch (ResourceAccessException exception) {
            throw new AgentProviderTimeoutException(exception);
        } catch (RestClientException exception) {
            throw new AgentProviderException("Agent provider request failed.", exception);
        }
    }

    private String url() {
        String baseUrl = properties.getBaseUrl();
        if (baseUrl.endsWith("/")) {
            return baseUrl.substring(0, baseUrl.length() - 1) + AGENT_EXECUTE_PATH;
        }
        return baseUrl + AGENT_EXECUTE_PATH;
    }
}

class AgentProviderException extends RuntimeException {

    AgentProviderException(String message) {
        super(message);
    }

    AgentProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}

class AgentProviderTimeoutException extends AgentProviderException {

    AgentProviderTimeoutException(Throwable cause) {
        super("Agent provider timed out.", cause);
    }
}
