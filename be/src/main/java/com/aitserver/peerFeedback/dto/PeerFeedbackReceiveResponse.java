package com.aitserver.peerFeedback.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class PeerFeedbackReceiveResponse {

    private String aiSummary;

    private List<PeerFeedbackDetailResponse> details;



}
