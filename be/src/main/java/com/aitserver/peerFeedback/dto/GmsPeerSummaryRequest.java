package com.aitserver.peerFeedback.dto;


import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class GmsPeerSummaryRequest {

    private Long sessionId;

    private List<GmsEvaluateeFeedbackGroup> evaluatees;
}