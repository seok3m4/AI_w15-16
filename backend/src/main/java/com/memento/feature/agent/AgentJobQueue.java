package com.memento.feature.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.memento.feature.jobs.AsyncJobRecord;
import java.util.UUID;

interface AgentJobQueue {

    AsyncJobRecord enqueueAgentTask(UUID ownerId, JsonNode input);
}
