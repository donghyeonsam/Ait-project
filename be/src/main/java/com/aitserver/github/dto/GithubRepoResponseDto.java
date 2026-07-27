package com.aitserver.github.dto;

import com.aitserver.github.entity.GithubRepo;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class GithubRepoResponseDto {
    private Long githubRepoId;
    private String name;
    private String nickname;
    private String url;
    private Boolean isPrivate;
    private LocalDateTime updatedAt;

    public static GithubRepoResponseDto from(GithubRepo repo) {
        String actualGithubOwner = repo.getGithubApp().getGithubUsername();

        return GithubRepoResponseDto.builder()
                .githubRepoId(repo.getRepoId())
                .name(repo.getRepoName())
                .nickname(repo.getRepoNickname())
                .url("https://github.com/" + actualGithubOwner + "/" + repo.getRepoName())
                .isPrivate(repo.getIsPrivate())
                .updatedAt(repo.getUpdatedAt())
                .build();
    }
}