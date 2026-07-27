package com.aitserver.github.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GithubRepoNicknameUpdateRequestDto {

    @NotBlank(message = "수정할 레포지토리 닉네임은 필수 입력 항목입니다.")
    @Size(max = 50, message = "닉네임은 최대 50자까지 설정 가능합니다.")
    private String repoNickname;
}