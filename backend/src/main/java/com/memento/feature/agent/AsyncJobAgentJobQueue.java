package com.memento.feature.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.memento.feature.jobs.AsyncJobCommandService;
import com.memento.feature.jobs.AsyncJobRecord;
import com.memento.feature.jobs.AsyncJobType;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
class AsyncJobAgentJobQueue implements AgentJobQueue {

    private final AsyncJobCommandService asyncJobCommandService;

    AsyncJobAgentJobQueue(AsyncJobCommandService asyncJobCommandService) {
        this.asyncJobCommandService = asyncJobCommandService;
    }

    @Override
    public AsyncJobRecord enqueueAgentTask(UUID ownerId, JsonNode input) {
        return asyncJobCommandService.enqueue(ownerId, AsyncJobType.AGENT_TASK, input, false, 1);
    }
}
