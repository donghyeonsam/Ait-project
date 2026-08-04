package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteEmbeddingItemRequest {

    @JsonProperty("doc_type")
    private String docType;

    @JsonProperty("target_id")
    private Long targetId;
}