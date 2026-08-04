package com.aitserver.aiInterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteEmbeddingsRequest {

    @JsonProperty("user_id")
    private Long userId;

    private List<DeleteEmbeddingItemRequest> items;
}