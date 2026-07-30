package com.aitserver.aiInterview.responseDto;

import com.aitserver.aiInterview.dto.VoiceResult;
import com.fasterxml.jackson.annotation.JsonProperty;

public record VoiceResultResponse(
        @JsonProperty("task_id") String taskId,
        @JsonProperty("status") String status,
        @JsonProperty("voice") VoiceResult voice,
        @JsonProperty("error") String error
) {}