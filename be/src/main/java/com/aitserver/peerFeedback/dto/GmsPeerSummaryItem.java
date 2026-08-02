package com.aitserver.peerFeedback.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GmsPeerSummaryItem {

    private Long evaluateeId;

    private String content;
}