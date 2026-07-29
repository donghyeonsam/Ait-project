package com.aitserver.aiInterview.responseDto;

import com.aitserver.aiInterview.dto.CoverLetterInfoForAiInterview;
import com.aitserver.aiInterview.dto.GithubRepoInfoForAiInterview;

import java.util.List;

public record AiInterviewPreparationResponse(
        Long userId,
        List<CoverLetterInfoForAiInterview> coverLetters,
        List<GithubRepoInfoForAiInterview> githubRepositories
) {}
