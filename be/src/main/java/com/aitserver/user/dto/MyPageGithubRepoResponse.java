package com.aitserver.user.dto;



import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class MyPageGithubRepoResponse {

    // 레포지토리 별칭 수정 시 어떤 레포인지 식별하기 위해 필요
    private Long githubRepoId;

    // 사용자가 수정 가능한 레포지토리 별칭
    private String repoNickname;

    // 실제 깃허브 레포지토리 주소
    private String repoUrl;
}
