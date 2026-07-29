package com.aitserver.studyGroupRoom.dto.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ApplicationProcessRequest {
    @JsonProperty("isApprove")
    private boolean isApprove; // true: 승인, false: 거절
}