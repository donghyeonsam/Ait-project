package com.aitserver.peerFeedback.dto;


import com.aitserver.peerFeedback.entity.AiPeerSummary;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AiPeerSummaryResponse {

    private Long summaryId;

    private Long sessionId;

    private Long evaluateeId;

    private String content;

    private LocalDateTime createdAt;

    public static AiPeerSummaryResponse from(
            AiPeerSummary summary
    ) {
        return AiPeerSummaryResponse.builder()
                .summaryId(summary.getId())
                .sessionId(
                        summary
                                .getStudySession()
                                .getId()
                )
                .evaluateeId(
                        summary
                                .getEvaluatee()
                                .getId()
                )
                .content(summary.getContent())
                .createdAt(summary.getCreatedAt())
                .build();
    }
}