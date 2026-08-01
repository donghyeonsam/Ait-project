package com.aitserver.peerFeedback.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PeerFeedbackCreateRequest {

    // 작성 대상
    private Long evaluateeId;

    // 논리성
    @Max(10)
    @Min(0)
    private Integer logicalScore;

    // 표현력
    @Max(10)
    @Min(0)
    private Integer communicationScore;

    // 태도
    @Max(10)
    @Min(0)
    private Integer attitudeScore;

    // 직무 전문성
    @Max(10)
    @Min(0)
    private Integer jobCompetencyScore;

    // 자신감
    @Max(10)
    @Min(0)
    private Integer confidenceScore;

    // 피드백
    private String feedback;




}
