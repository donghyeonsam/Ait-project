package com.aitserver.peerFeedback.entity;

import com.aitserver.studySession.entity.StudySession;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(
        name = "peer_feedbacks",
        indexes = {
                @Index(
                        name = "idx_peer_feedbacks_session_id",
                        columnList = "session_id"
                ),
                @Index(
                        name = "idx_peer_feedbacks_evaluator_id",
                        columnList = "evaluator_id"
                ),
                @Index(
                        name = "idx_peer_feedbacks_evaluatee_id",
                        columnList = "evaluatee_id"
                )
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PeerFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 상호평가가 진행된 화상 스터디 세션
     */
    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "session_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_peer_feedbacks_session"
            )
    )
    private StudySession studySession;

    /**
     * 평가를 작성한 사용자 ID
     *
     * DB에 users 테이블 외래키가 설정되어 있지 않으므로
     * User 연관관계가 아닌 단순 Long 값으로 저장합니다.
     */
    @Column(
            name = "evaluator_id",
            nullable = false
    )
    private Long evaluatorId;

    /**
     * 평가를 받은 사용자 ID
     */
    @Column(
            name = "evaluatee_id",
            nullable = false
    )
    private Long evaluateeId;

    /**
     * 논리성 점수
     */
    @Column(
            name = "logical_score",
            nullable = false
    )
    private int logicalScore;


    /**
     * 표현력 점수
     */
    @Column(
            name = "communication_score",
            nullable = false
    )
    private int communicationScore;

    /**
     * 면접 태도 점수
     */
    @Column(
            name = "attitude_score",
            nullable = false
    )
    private int attitudeScore;

    /**
     * 직무 전문성 점수
     */
    @Column(
            name = "job_competency_score",
            nullable = false
    )
    private int jobCompetencyScore;



    /**
     * 자신감 점수
     */
    @Column(
            name = "confidence_score",
            nullable = false
    )
    private int confidenceScore;

    /**
     * 자유 형식 피드백
     */
    @Lob
    @Column(
            name = "feedback",
            nullable = false,
            columnDefinition = "TEXT"
    )
    private String feedback;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    private PeerFeedback(
            StudySession studySession,
            Long evaluatorId,
            Long evaluateeId,
            int logicalScore,
            int communicationScore,
            int attitudeScore,
            int jobCompetencyScore,
            int confidenceScore,
            String feedback
    ) {
        this.studySession = studySession;
        this.evaluatorId = evaluatorId;
        this.evaluateeId = evaluateeId;
        this.logicalScore = logicalScore;
        this.communicationScore = communicationScore;
        this.attitudeScore = attitudeScore;
        this.jobCompetencyScore = jobCompetencyScore;
        this.confidenceScore = confidenceScore;
        this.feedback = feedback;
    }

    public static PeerFeedback create(
            StudySession studySession,
            Long evaluatorId,
            Long evaluateeId,
            int logicalScore,
            int communicationScore,
            int attitudeScore,
            int jobCompetencyScore,
            int confidenceScore,
            String feedback
    ) {
        return new PeerFeedback(
                studySession,
                evaluatorId,
                evaluateeId,
                logicalScore,
                communicationScore,
                attitudeScore,
                jobCompetencyScore,
                confidenceScore,
                feedback
        );
    }
}
