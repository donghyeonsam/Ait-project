package com.aitserver.aiInterview.dto;



import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class DeleteEmbeddingsResponse {

    @JsonProperty("user_id")
    private Long userId;

    @JsonProperty("requested_count")
    private int requestedCount;

    private boolean deleted;

    private String message;
}