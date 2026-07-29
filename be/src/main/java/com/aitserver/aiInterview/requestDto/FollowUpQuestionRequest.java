//package com.aitserver.aiInterview.dto;
//
//import com.fasterxml.jackson.annotation.JsonAlias;
//import com.fasterxml.jackson.annotation.JsonProperty;
//import java.util.List;
//
//public record FollowUpQuestionRequest(
//        @JsonAlias("interviewType") @JsonProperty("interview_type") String interviewType,
//        @JsonAlias("resumeId")      @JsonProperty("resume_id")       Long resumeId,
//        @JsonAlias("coverLetterId") @JsonProperty("cover_letter_id") Long coverLetterId,
//        @JsonAlias("githubRepoId")  @JsonProperty("github_repo_id")  Long githubRepoId,
//        @JsonProperty("question")   QuestionInfo question,
//        @JsonProperty("answer")     String answer
//) {
//    public record QuestionInfo(
//            @JsonProperty("order")    Integer order,
//            @JsonProperty("question") String question,
//            @JsonProperty("rubric")   List<String> rubric,
//            @JsonProperty("topic")    String topic,
//            @JsonProperty("source")   String source,
//            @JsonProperty("depth")    Integer depth
//    ) {}
//}
package com.aitserver.aiInterview.requestDto;

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
public class FollowUpQuestionRequest {

    @JsonAlias("interviewType")
    @JsonProperty("interview_type")
    private String interviewType;

    @JsonAlias("resumeId")
    @JsonProperty("resume_id")
    private Long resumeId;

    @JsonAlias("coverLetterId")
    @JsonProperty("cover_letter_id")
    private Long coverLetterId;

    @JsonAlias("githubRepoId")
    @JsonProperty("github_repo_id")
    private Long githubRepoId;

    @JsonProperty("question")
    private QuestionInfo question;

    @JsonProperty("answer")
    private String answer;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    public static class QuestionInfo {
        @JsonProperty("order")
        private Integer order;

        @JsonProperty("question")
        private String question;

        @JsonProperty("rubric")
        private List<String> rubric;

        @JsonProperty("topic")
        private String topic;

        @JsonProperty("source")
        private String source;

        @JsonProperty("depth")
        private Integer depth;
    }
}