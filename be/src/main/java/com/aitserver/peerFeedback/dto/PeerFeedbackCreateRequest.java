package com.aitserver.peerFeedback.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class PeerFeedbackCreateRequest {

    // 작성 대상
    private Long evaluateeId;

    // 논리성
    private Integer logicalScore;

    // 표현력
    private Integer communicationScore;

    // 태도
    private Integer attitudeScore;

    // 직무 전문성
    private Integer jobCompetencyScore;

    // 자신감
    private Integer confidenceScore;

    // 피드백
    private String feedback;




}
