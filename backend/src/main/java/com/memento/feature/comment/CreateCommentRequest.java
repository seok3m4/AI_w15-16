package com.memento.feature.comment;

import jakarta.validation.constraints.NotBlank;

record CreateCommentRequest(@NotBlank String content) {
}
