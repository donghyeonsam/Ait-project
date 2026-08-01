package com.aitserver.peerFeedback.dto;


import com.aitserver.peerFeedback.entity.PeerFeedback;
import com.aitserver.studySession.dto.MemberResponse;
import com.aitserver.studySession.entity.StudySessionParticipant;
import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeerFeedbackDetailResponse {

    private Long id;

    private Long sessionId;

    // 작성자
    private Long evaluatorId;

    // 받는 사람
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

    // 점수 종합 평균
    private Double scoreAvg;

    // 피드백
    private String feedback;


    private static double calculateAverage(
            PeerFeedback peerFeedback
    ) {
        int totalScore =
                peerFeedback.getLogicalScore()
                        + peerFeedback.getCommunicationScore()
                        + peerFeedback.getAttitudeScore()
                        + peerFeedback.getJobCompetencyScore()
                        + peerFeedback.getConfidenceScore();

        return totalScore / 5.0;
    }


    public static PeerFeedbackDetailResponse from(
            PeerFeedback peerFeedback
    ) {
        return PeerFeedbackDetailResponse.builder()
                .id(peerFeedback.getId())
                .sessionId(peerFeedback.getStudySession().getId())
                .evaluatorId(peerFeedback.getEvaluatorId())
                .evaluateeId(peerFeedback.getEvaluateeId())
                .logicalScore(peerFeedback.getLogicalScore())
                .communicationScore(peerFeedback.getCommunicationScore())
                .attitudeScore(peerFeedback.getAttitudeScore())
                .jobCompetencyScore(peerFeedback.getJobCompetencyScore())
                .confidenceScore(peerFeedback.getConfidenceScore())
                .scoreAvg(calculateAverage(peerFeedback))
                .feedback(peerFeedback.getFeedback())
                .build();
    }







}
