package com.memento.feature.memory;

import java.util.UUID;

class JobNotFoundException extends RuntimeException {

    JobNotFoundException(UUID jobId) {
        super("Async job not found: " + jobId);
    }
}
