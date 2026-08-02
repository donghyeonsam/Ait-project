package com.aitserver.peerFeedback.dto;



import com.aitserver.peerFeedback.entity.PeerFeedback;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GmsPeerFeedbackItem {

    private Long evaluatorId;

    private Integer logicalScore;

    private Integer communicationScore;

    private Integer attitudeScore;

    private Integer jobCompetencyScore;

    private Integer confidenceScore;

    private String feedback;

    public static GmsPeerFeedbackItem from(
            PeerFeedback peerFeedback
    ) {
        return GmsPeerFeedbackItem.builder()
                .evaluatorId(
                        peerFeedback
                                .getEvaluatorId()
                )
                .logicalScore(
                        peerFeedback.getLogicalScore()
                )
                .communicationScore(
                        peerFeedback.getCommunicationScore()
                )
                .attitudeScore(
                        peerFeedback.getAttitudeScore()
                )
                .jobCompetencyScore(
                        peerFeedback.getJobCompetencyScore()
                )
                .confidenceScore(
                        peerFeedback.getConfidenceScore()
                )
                .feedback(
                        peerFeedback.getFeedback()
                )
                .build();
    }
}
