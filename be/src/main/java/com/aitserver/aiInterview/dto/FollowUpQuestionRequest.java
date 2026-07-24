package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record FollowUpQuestionRequest(
        Long resumeId,
        Long coverLetterId,
        Long githubRepoId,
        QuestionInfo question,
        String answer
) {
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record QuestionInfo(
            Integer order,
            String question,
            List<String> rubric,
            String topic,
            String source,
            Integer depth
    ) {}
}