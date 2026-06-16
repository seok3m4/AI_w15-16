package com.memento.feature.tag;

import java.util.UUID;

record TagResponse(UUID id, String name, int postCount) {

    static TagResponse from(TagRecord record) {
        return new TagResponse(record.id(), record.name(), record.postCount());
    }
}
