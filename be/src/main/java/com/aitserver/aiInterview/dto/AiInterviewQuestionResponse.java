package com.aitserver.aiInterview.dto;

import lombok.Builder;
import java.util.List;

@Builder
public record AiInterviewQuestionResponse(
        Long userId,
        Long aiInterviewId,
        String interviewType,
        Boolean ragUsed,
        List<QuestionInfo> questions
) {
    /**
     * 질문 상세 정보를 담는 내부 Record
     */
    @Builder
    public record QuestionInfo(
            Integer order,
            String question,
            List<String> rubric,
            String topic,
            String source
    ) {}

    /**
     * [팩토리 메서드] FastAPI 응답 DTO(FastQuestionGenerateResponse)와 userId를 받아
     * 프론트엔드 응답 DTO로 손쉽게 변환해주는 static 메서드
     */
    public static AiInterviewQuestionResponse of(Long userId, FastQuestionGenerateResponse fastResponse) {
        List<QuestionInfo> questionInfos = fastResponse.questions().stream()
                .map(q -> QuestionInfo.builder()
                        .order(q.order())
                        .question(q.question())
                        .rubric(q.rubric())
                        .topic(q.topic())
                        .source(q.source())
                        .build())
                .toList();

        return AiInterviewQuestionResponse.builder()
                .userId(userId)
                .aiInterviewId(fastResponse.aiInterviewId())
                .interviewType(fastResponse.interviewType())
                .ragUsed(fastResponse.ragUsed())
                .questions(questionInfos)
                .build();
    }
}