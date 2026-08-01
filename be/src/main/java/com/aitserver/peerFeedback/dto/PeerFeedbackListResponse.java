package com.aitserver.peerFeedback.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class PeerFeedbackListResponse {

    private Long sessionId;

    private LocalDateTime createdAt;

    private String sessionTitle;

    private Double scoreAvg;
}