package com.memento.feature.capsule;

import java.util.List;

record ContextCapsuleListResponse(List<ContextCapsuleSummaryResponse> items, ContextCapsulePageResponse page) {
}

