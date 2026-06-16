package com.memento.feature.tag;

import java.util.List;

record TagListResponse(List<TagResponse> items, TagPageResponse page) {
}
