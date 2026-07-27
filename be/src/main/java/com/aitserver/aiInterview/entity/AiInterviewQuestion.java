package com.aitserver.aiInterview.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "ai_interview_questions",
        indexes = {
                @Index(name = "idx_ai_interview_questions_ai_interview_id", columnList = "ai_interview_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiInterviewQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ai_interview_id", nullable = false)
    private Long aiInterviewId;

    @Column(name = "question", nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(name = "user_answer", columnDefinition = "TEXT")
    private String userAnswer;

    @Column(name = "ai_answer", columnDefinition = "TEXT")
    private String aiAnswer;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Builder
    public AiInterviewQuestion(Long aiInterviewId, String question, String userAnswer,
                               String aiAnswer, String feedback) {
        this.aiInterviewId = aiInterviewId;
        this.question = question;
        this.userAnswer = userAnswer;
        this.aiAnswer = aiAnswer;
        this.feedback = feedback;
    }

    // 답변 및 피드백 업데이트 메서드
    public void updateAnswerAndFeedback(String userAnswer, String aiAnswer, String feedback) {
        this.userAnswer = userAnswer;
        this.aiAnswer = aiAnswer;
        this.feedback = feedback;
    }
}