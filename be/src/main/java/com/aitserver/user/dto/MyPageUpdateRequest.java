package com.aitserver.user.dto;


import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class MyPageUpdateRequest {

    @NotBlank(message = "이름은 필수입니다.")
    @Size(max = 20, message = "이름은 20자 이하여야 합니다.")
    private String name;

    @NotBlank(message = "닉네임은 필수입니다.")
    @Size(max = 20, message = "닉네임은 20자 이하여야 합니다.")
    private String nickname;

    @Size(max = 30, message = "1순위 관심 직무는 30자 이하여야 합니다.")
    private String firstJobInterest;

    @Size(max = 30, message = "2순위 관심 직무는 30자 이하여야 합니다.")
    private String secondJobInterest;

    @NotNull(message = "기술 스택 목록은 필수입니다.")
    private List<
            @NotBlank(message = "기술명은 비어 있을 수 없습니다.")
            @Size(max = 20, message = "기술명은 20자 이하여야 합니다.")
                    String
            > skills;

    @NotNull(message = "깃허브 레포지토리 목록은 필수입니다.")
    @Valid
    private List<MyPageGithubRepoUpdateRequest> githubRepositories;
}