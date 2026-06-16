package com.memento.feature.post;

import java.util.List;

record PostListResponse(List<PostSummaryResponse> items, PageResponse page) {
}
