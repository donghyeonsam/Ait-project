package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

public record FollowUpQuestionResponse(
        // FastAPI의 "is_pass" 키값을 매핑받고, 프론트로 보낼 때는 자바 변수명인 "isPass"로 나갑니다.
        @JsonAlias("is_pass")
        Boolean isPass,

        // FastAPI의 "next_question" 키값을 매핑받고, 프론트로 보낼 때는 "nextQuestion"으로 나갑니다.
        @JsonAlias("next_question")
        QuestionInfo nextQuestion
) {
    /**
     * 꼬리 질문 상세 정보
     * (내부 필드들은 모두 단일 단어로 되어 있어 camelCase와 snake_case가 동일합니다)
     */
    public record QuestionInfo(
            Integer order,
            String question,
            List<String> rubric,
            String topic,
            String source,
            Integer depth
    ) {}
}