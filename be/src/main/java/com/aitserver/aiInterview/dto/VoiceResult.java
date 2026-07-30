package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record VoiceResult(
        @JsonProperty("score") Integer score
) {}