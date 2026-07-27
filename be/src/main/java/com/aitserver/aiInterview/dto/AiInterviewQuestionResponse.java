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
            String source,
            Integer depth
    ) {}

    /**
     * [팩토리 메서드] FastAPI 응답 DTO(FastQuestionGenerateResponse)와 userId를 받아
     * 프론트엔드 응답 DTO로 손쉽게 변환해주는 static 메서드
     */
    public static AiInterviewQuestionResponse of(Long userId, FastQuestionGenerateResponse fastResponse) {

        // FastQuestionGenerateResponse가 클래스로 바뀌었으므로 .getQuestions()로 호출
        List<QuestionInfo> questionInfos = fastResponse.getQuestions().stream()
                .map(q -> QuestionInfo.builder()
                        .order(q.getOrder())
                        .question(q.getQuestion())
                        .rubric(q.getRubric())
                        .topic(q.getTopic())
                        .source(q.getSource())
                        .depth(q.getDepth())
                        .build())
                .toList();

        return AiInterviewQuestionResponse.builder()
                .userId(userId)
                .aiInterviewId(fastResponse.getAiInterviewId()) // .getAiInterviewId() 사용
                .interviewType(fastResponse.getInterviewType()) // .getInterviewType() 사용
                .ragUsed(fastResponse.getRagUsed())             // .getRagUsed() 사용
                .questions(questionInfos)
                .build();
    }
}