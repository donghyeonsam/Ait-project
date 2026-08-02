package com.aitserver.peerFeedback.dto;


import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GmsPeerSummaryResponse {

    private List<GmsPeerSummaryItem> summaries;
}