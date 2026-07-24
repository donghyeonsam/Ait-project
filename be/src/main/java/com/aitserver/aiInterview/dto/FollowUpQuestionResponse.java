package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class FollowUpQuestionResponse {

    @JsonAlias("is_pass")
    private Boolean isPass;

    private String feedback;

    @JsonAlias("next_question")
    private QuestionInfo nextQuestion;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    public static class QuestionInfo {
        private Integer order;
        private String question;
        private List<String> rubric;
        private String topic;
        private String source;
        private Integer depth;
    }
}