package com.aitserver.aiInterview.dto;

import java.time.LocalDateTime;

public record GithubRepoInfoForAiInterview(
        Long id,
        String repoName,
        String repoNickname,
        LocalDateTime createdAt
) {}
