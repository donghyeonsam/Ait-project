package com.aitserver.aiInterview.responseDto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record VoiceAcceptedResponse(
        @JsonProperty("task_id") String taskId,
        @JsonProperty("status") String status
) {}