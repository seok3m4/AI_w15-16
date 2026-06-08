package com.week15.board.post.presentation.dto;

import com.week15.board.post.application.PostUpdateCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostUpdateRequest(
        @NotBlank(message = "제목은 필수입니다.")
        @Size(max = 200, message = "제목은 200자 이하로 입력해 주세요.")
        String title,

        @NotBlank(message = "내용은 필수입니다.")
        String content
) {

    public PostUpdateCommand toCommand() {
        return new PostUpdateCommand(title, content);
    }
}

