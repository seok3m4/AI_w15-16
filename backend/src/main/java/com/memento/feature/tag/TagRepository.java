package com.memento.feature.tag;

import java.util.List;
import java.util.UUID;

interface TagRepository {

    List<TagRecord> findPageByOwner(UUID ownerId, int limit, int offset);

    long countByOwner(UUID ownerId);
}
