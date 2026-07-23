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
        name = "ai_interviews",
        indexes = {
                @Index(name = "idx_ai_interviews_user_id", columnList = "user_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiInterview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "interview_type", length = 30, nullable = false)
    private String interviewType;

    @Column(name = "difficulty", length = 30, nullable = false)
    private String difficulty;

    @Column(name = "ai_attitude_style", length = 30, nullable = false)
    private String aiAttitudeStyle;

    @Column(name = "status", length = 30, nullable = false)
    private String status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Builder
    public AiInterview(Long userId, String interviewType, String difficulty,
                       String aiAttitudeStyle, String status) {
        this.userId = userId;
        this.interviewType = interviewType;
        this.difficulty = difficulty;
        this.aiAttitudeStyle = aiAttitudeStyle;
        this.status = status;
    }

    // 면접 상태 변경 메서드 (예: 진행중 -> 완료)
    public void updateStatus(String status) {
        this.status = status;
    }

    // 면접 종료 처리 메서드
    public void finishInterview() {
        this.status = "COMPLETED"; // 프로젝트 상태 값 정의에 맞춰 변경 가능
        this.endedAt = LocalDateTime.now();
    }
}
