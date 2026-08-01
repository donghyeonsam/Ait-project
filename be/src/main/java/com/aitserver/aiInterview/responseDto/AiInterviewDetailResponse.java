package com.aitserver.aiInterview.responseDto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class AiInterviewDetailResponse {

    // 1. 면접 기본 정보
    private Long aiInterviewId;
    private String interviewType;
    private String difficulty;
    private LocalDateTime createdAt;

    // 2. 종합 리포트 정보
    @JsonRawValue
    private String content; // JSON 문자열 (strengths, weaknesses 포함)
    private Double eyeContactScore;
    private Double faceScore;
    private Double voiceScore;
    private Double qnaScore;
    private Double sentenceScore;

    // 3. 질문/답변 내역 리스트
    private List<QuestionDetailDto> questions;

    @Getter
    @Builder
    public static class QuestionDetailDto {
        private Long questionId;
        private String question;
        private String userAnswer;
        private String aiAnswer;
        private String feedback;
    }
}