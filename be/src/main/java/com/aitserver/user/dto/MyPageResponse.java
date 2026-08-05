package com.aitserver.user.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
public class MyPageResponse {

    private Long userId;

    private String name;

    private String nickname;

    private String email;

    private String firstJobInterest;

    private String secondJobInterest;

    private String profileImageUrl;

    private List<String> skills;

    private String githubUsername;

    private String githubUrl;

    private List<MyPageGithubRepoResponse> githubRepositories;
}