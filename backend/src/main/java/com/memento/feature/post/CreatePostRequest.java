package com.memento.feature.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

record CreatePostRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank String content,
        List<@Size(max = 50) String> tagNames) {
}
