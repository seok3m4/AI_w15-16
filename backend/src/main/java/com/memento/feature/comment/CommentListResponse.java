package com.memento.feature.comment;

import java.util.List;

record CommentListResponse(List<CommentResponse> items, CommentPageResponse page) {
}
