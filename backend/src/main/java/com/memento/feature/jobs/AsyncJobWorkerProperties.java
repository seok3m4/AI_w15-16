package com.memento.feature.jobs;

import java.time.Duration;

public class AsyncJobWorkerProperties {

    private Duration pollInterval = Duration.ofSeconds(5);
    private Duration staleTimeout = Duration.ofSeconds(60);
    private int claimLimit = 1;
    private int defaultMaxAttempts = 3;

    public Duration getPollInterval() {
        return pollInterval;
    }

    public void setPollInterval(Duration pollInterval) {
        this.pollInterval = pollInterval;
    }

    public Duration getStaleTimeout() {
        return staleTimeout;
    }

    public void setStaleTimeout(Duration staleTimeout) {
        this.staleTimeout = staleTimeout;
    }

    public int getClaimLimit() {
        return claimLimit;
    }

    public void setClaimLimit(int claimLimit) {
        this.claimLimit = claimLimit;
    }

    public int getDefaultMaxAttempts() {
        return defaultMaxAttempts;
    }

    public void setDefaultMaxAttempts(int defaultMaxAttempts) {
        this.defaultMaxAttempts = defaultMaxAttempts;
    }
}
