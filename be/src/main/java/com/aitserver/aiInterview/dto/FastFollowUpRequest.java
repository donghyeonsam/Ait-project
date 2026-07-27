package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FastFollowUpRequest {

    @JsonProperty("user_id")
    private Long userId;

    @JsonProperty("ai_interview_id")
    private Long aiInterviewId;

    @JsonUnwrapped
    private FollowUpQuestionRequest request;
}