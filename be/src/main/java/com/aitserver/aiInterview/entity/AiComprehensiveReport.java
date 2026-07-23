package com.aitserver.aiInterview.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "ai_comprehensive_reports",
        indexes = {
                @Index(name = "idx_ai_comprehensive_reports_ai_interview_id", columnList = "ai_interview_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiComprehensiveReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ai_interview_id", nullable = false)
    private Long aiInterviewId;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "eye_contact_score", nullable = false)
    private Integer eyeContactScore;

    @Column(name = "face_score", nullable = false)
    private Integer faceScore;

    @Column(name = "voice_score", nullable = false)
    private Integer voiceScore;

    @Column(name = "answer_score", nullable = false)
    private Integer answerScore;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public AiComprehensiveReport(Long aiInterviewId, String content, Integer eyeContactScore,
                                 Integer faceScore, Integer voiceScore, Integer answerScore) {
        this.aiInterviewId = aiInterviewId;
        this.content = content;
        this.eyeContactScore = eyeContactScore;
        this.faceScore = faceScore;
        this.voiceScore = voiceScore;
        this.answerScore = answerScore;
    }
}