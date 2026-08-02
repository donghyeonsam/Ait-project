package com.aitserver.peerFeedback.entity;


import com.aitserver.studySession.entity.StudySession;
import com.aitserver.auth.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "ai_peer_summaries",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_ai_peer_summaries_session_evaluatee",
                        columnNames = {
                                "session_id",
                                "evaluatee_id"
                        }
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiPeerSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "session_id",
            nullable = false
    )
    private StudySession studySession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "evaluatee_id",
            nullable = false
    )
    private User evaluatee;

    @Column(
            nullable = false,
            columnDefinition = "TEXT"
    )
    private String content;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Builder
    public AiPeerSummary(
            StudySession studySession,
            User evaluatee,
            String content
    ) {
        this.studySession = studySession;
        this.evaluatee = evaluatee;
        this.content = content;
    }
}