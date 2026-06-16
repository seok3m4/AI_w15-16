package com.memento.feature.capsule;

import java.util.List;

record ContextCapsuleDraftRequest(
        String requestId,
        String jobId,
        String idempotencyKey,
        String purpose,
        String query,
        String scope,
        int maxSources,
        List<ContextCapsuleDraftSource> sources) {
}
