package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class FastQuestionGenerateResponse {

    private Long aiInterviewId;          // "ai_interview_id"
    private String interviewType;        // "interview_type"
    private Boolean ragUsed;             // "rag_used"
    private List<QuestionDto> questions;  // "questions"

    /**
     * 질문 상세 정보를 담는 중첩 static 클래스
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class QuestionDto {
        private Integer order;            // "order"
        private String question;          // "question"
        private List<String> rubric;      // "rubric"
        private String topic;             // "topic"
        private String source;            // "source"
    }
}