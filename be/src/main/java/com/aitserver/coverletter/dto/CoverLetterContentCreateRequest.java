package com.aitserver.coverletter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CoverLetterContentCreateRequest {

    @NotNull(message = "문항 순서는 필수입니다.")
    @Positive(message = "문항 순서는 1 이상이어야 합니다.")
    private Integer contentOrder;

    @NotBlank(message = "자기소개서 질문은 필수입니다.")
    @Size(max = 255, message = "자기소개서 질문은 255자 이하여야 합니다.")
    private String question;

    @NotBlank(message = "자기소개서 답변은 필수입니다.")
    private String answer;
}