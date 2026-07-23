package com.aitserver.global.analysis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AnalysisForwardItem(

        @JsonProperty("doc_type")
        String docType,

        @JsonProperty("target_id")
        Long targetId,

        String content
) {
}