package com.aitserver.aiInterview.dto;

import java.util.List;

public record FollowUpQuestionRequest(
        QuestionInfo question,
        String answer
) {
    public record QuestionInfo(
            Integer order,
            String question,
            List<String> rubric,
            String topic,
            String source
    ) {}
}
