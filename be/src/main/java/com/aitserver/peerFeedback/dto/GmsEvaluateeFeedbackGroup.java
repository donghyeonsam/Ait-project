package com.aitserver.peerFeedback.dto;


import lombok.Getter;

import java.util.ArrayList;
import java.util.List;

@Getter
public class GmsEvaluateeFeedbackGroup {

    private final Long evaluateeId;

    private final List<GmsPeerFeedbackItem> feedbacks =
            new ArrayList<>();

    public GmsEvaluateeFeedbackGroup(
            Long evaluateeId
    ) {
        this.evaluateeId = evaluateeId;
    }

    public void addFeedback(
            GmsPeerFeedbackItem feedback
    ) {
        feedbacks.add(feedback);
    }
}
