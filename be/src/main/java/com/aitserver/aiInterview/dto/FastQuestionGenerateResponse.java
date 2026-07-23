package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record FastQuestionGenerateResponse(
        Long aiInterviewId,          // "ai_interview_id": "100" (숫자/문자열 자동 매핑)
        String interviewType,        // "interview_type": "cs"
        Boolean ragUsed,             // "rag_used": true
        List<QuestionDto> questions  // "questions": [...]
) {
    /**
     * 질문 상세 정보를 담는 중첩 Record
     */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record QuestionDto(
            Integer order,            // "order": 1
            String question,          // "question": "..."
            List<String> rubric,      // "rubric": ["...", "..."]
            String topic,             // "topic": "캐싱 전략"
            String source             // "source": "cover_letter"
    ) {}
}