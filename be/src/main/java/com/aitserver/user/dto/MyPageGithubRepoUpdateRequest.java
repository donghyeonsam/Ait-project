package com.aitserver.user.dto;



import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class MyPageGithubRepoUpdateRequest {

    @NotNull(message = "깃허브 레포지토리 ID는 필수입니다.")
    private Long githubRepoId;

    @NotBlank(message = "레포지토리 별칭은 필수입니다.")
    @Size(max = 100, message = "레포지토리 별칭은 100자 이하여야 합니다.")
    private String repoNickname;
}