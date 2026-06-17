package com.memento.feature.memory;

import java.util.List;
import java.util.UUID;

interface MemorySummarySourceReader {

    List<MemorySummarySource> findSourcesForOwnerPostIds(UUID ownerId, List<UUID> postIds);
}
