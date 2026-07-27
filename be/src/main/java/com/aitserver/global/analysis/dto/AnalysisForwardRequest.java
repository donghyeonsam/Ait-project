package com.aitserver.global.analysis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AnalysisForwardRequest(

        @JsonProperty("user_id")
        Long userId,

        List<AnalysisForwardItem> items
) {
}