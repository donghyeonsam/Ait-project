package com.aitserver.aiInterview.responseDto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GmsAnalysisResponse(
        @JsonProperty("ai_answer")
        String aiAnswer,

        @JsonProperty("feedback")
        String feedback,

        @JsonProperty("qna_score")
        Integer qnaScore,

        @JsonProperty("sentence_score")
        Integer sentenceScore
) {}
