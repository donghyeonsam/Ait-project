package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GmsAnalysisResponse(
        @JsonProperty("ai_answer")
        String aiAnswer,

        @JsonProperty("feedback")
        String feedback,

        @JsonProperty("score")
        Integer score
) {}
