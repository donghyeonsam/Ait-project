package com.aitserver.aiInterview.dto;

import java.util.List;

public record AiInterviewQuestionRequest(
        String jobRole,
        String experienceLevel,
        Long resumeId,
        Long coverLetterId,
        Long githubRepoId,
        String interviewType,
        List<String> csCategories,
        String difficulty,
        String aiAttitudeStyle
) {}
