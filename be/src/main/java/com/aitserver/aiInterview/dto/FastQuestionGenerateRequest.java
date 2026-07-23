package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

import java.util.List;

@Builder
public record FastQuestionGenerateRequest(
        @JsonProperty("user_id")
        Long userId,

        @JsonProperty("ai_interview_id")
        Long aiInterviewId,

        @JsonProperty("position")
        String position,

        @JsonProperty("career")
        String career,

        @JsonProperty("skills")
        List<String> skills,

        @JsonProperty("resume_id")
        Long resumeId,

        @JsonProperty("cover_letter_id")
        Long coverLetterId,

        @JsonProperty("github_repo_id")
        Long githubRepoId,

        @JsonProperty("interview_type")
        String interviewType,

        @JsonProperty("cs_categories")
        List<String> csCategories,

        @JsonProperty("difficulty")
        String difficulty,

        @JsonProperty("ai_attitude_style")
        String aiAttitudeStyle
) {}