package com.aitserver.aiInterview.dto;

import java.util.List;

public record AiInterviewPreparationResponse(
        Long userId,
        List<CoverLetterInfoForAiInterview> coverLetters,
        List<GithubRepoInfoForAiInterview> githubRepositories
) {}
