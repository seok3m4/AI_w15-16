package com.memento.feature.jobs;

import com.fasterxml.jackson.databind.JsonNode;

public interface AsyncJobHandler {

    AsyncJobType type();

    JsonNode handle(ClaimedAsyncJob job);
}
